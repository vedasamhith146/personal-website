# How I Trained My Own GPT-2 (124M) on the FineWeb-Edu Dataset

So, what do you actually need to train a model yourself?

- A good dataset
- Enough compute
- Some coding skills

I like to code by breaking everything down clearly. If you write a line of code, you must know what it does exactly. In this training process, the base code isn't the difficult part. The interesting and important part is the set of optimisations we apply to utilise our compute fully.

Let's go step by step.

---

## 1. Data Preparation

First, you have to choose the dataset you'll train your model on. I chose **FineWeb‑Edu‑10BT** (specifically the `sample-10BT` subset), the same dataset Andrej uses. FineWeb‑Edu is considered a good dataset for training small language models like GPT-2.

---

### 1.1. Project Setup

Open VS Code and:

1. Create a new folder named `GPT-2`.
2. Inside it, create a new file named `fineweb.py`.

We'll import libraries gradually as we need them (even though, for readability, they're usually grouped at the top of the file). This way, it's easier to explain everything from scratch.

---

### 1.2. Loading the Dataset

Python has a dedicated Hugging Face library called `datasets` for working with datasets. We'll use its `load_dataset` function.

```python
from datasets import load_dataset
```

Some important parameters of `load_dataset`:

- **`path`**: Which dataset to load. In our case: `"HuggingFaceFW/fineweb-edu"`.
- **`name`**: Which version/subset of the dataset to use. Here: `"sample-10BT"`.
- **`split`**: Which split to load — `"train"`, `"test"`, or `"validation"`. Since we're training, we'll use `"train"`.
- **`streaming`**: If `True`, data is streamed instead of fully downloaded to disk. This is crucial if you don't have enough disk space. With `streaming=True`, documents are downloaded in small chunks, processed, and then discarded.

```python
from datasets import load_dataset

fw = load_dataset("HuggingFaceFW/fineweb-edu", name="sample-10BT", split="train", streaming=True)
```

Now we have raw text, but we still need to tokenize it so we can feed it into the model.

---

### 1.3. Tokenization and Multiprocessing

Tokenization is typically CPU‑bound work. To tokenize faster, we want to use as many CPU cores as possible — this is where **multiprocessing** comes in. It lets us tokenize multiple documents simultaneously.

```python
from datasets import load_dataset
import os
import multiprocessing as mp

fw = load_dataset("HuggingFaceFW/fineweb-edu", name="sample-10BT", split="train", streaming=True)
```

The function `cpu_count()` returns the number of **logical** cores, not physical cores. For example, if your CPU has 4 physical cores but supports Hyper-Threading, the OS might see 8 logical cores. In practice, we often only use half the logical cores (i.e., the number of physical cores) for better performance.

```python
nprocs = max(1, os.cpu_count() // 2)
```

---

### 1.4. Using `Pool`

`Pool` lets us run Python processes in parallel. When we create a `Pool` with `nprocs` workers, it spins up that many worker processes once; they stay alive and process many documents.

We'll also use `Pool.imap`, which is a **streaming** version of `Pool.map`:

- `Pool.map(func, iterable)` — computes all results and returns them as a list (waits for everything).
- `Pool.imap(func, iterable, chunksize=…)` — returns an iterator and yields results as they are ready, in order.

We want streaming behaviour (just like `streaming=True` for the dataset) so we don't keep everything in memory at once.

Parameters for `Pool.imap` in our case:

- **`func`**: the tokenizer function
- **`iterable`**: the dataset iterator `fw`
- **`chunksize`**: how many documents each worker receives per batch, to reduce inter‑process communication cost

`chunksize=16` is a commonly used, reasonable choice:

```python
from datasets import load_dataset
import os
import multiprocessing as mp

fw = load_dataset("HuggingFaceFW/fineweb-edu", name="sample-10BT", split="train", streaming=True)
nprocs = max(1, os.cpu_count() // 2)

with mp.Pool(nprocs) as pool:
    pool.imap(tokenize, fw, chunksize=16)
```

> Note: We haven't defined `tokenize` yet.

---

### 1.5. Defining the Tokenizer Function

We want our `tokenize` function to:

- Take a single document as input.
- Return a NumPy array of token IDs.
- Prepend a special `<|endoftext|>` token to separate documents.

We'll use the `tiktoken` library to get the GPT‑2 tokenizer.

```python
import tiktoken
import numpy as np

def tokenize(doc):
    enc = tiktoken.get_encoding('gpt2')
    eot = enc._special_tokens['<|endoftext|>']
    tokens = [eot]
    tokens.extend(enc.encode_ordinary(doc["text"]))
    tokens_np = np.array(tokens)
    return tokens_np.astype(np.uint16)
```

A few important notes:

1. `encode_ordinary` ignores special tokens, so our explicit `<|endoftext|>` stays at the start of each document and doesn't appear inside the text.
2. We access `doc["text"]` because each document is a dictionary like `{ "text": …, "url": … }`.
3. We use `np.uint16` because it uses only 2 bytes per token ID, which saves memory and disk space.

`imap` returns an iterator of token arrays. On the first iteration you get tokens for `doc1`; on the second, `doc2`; and so on.

---

### 1.6. Sharding Tokens into Binary Files

We don't want to keep all tokens in memory. Instead, we:

1. Create a large NumPy array that can hold a fixed number of tokens (e.g., 100 million).
2. Stream token arrays from `pool.imap`.
3. Fill the large array with tokens.
4. Once the array is full, write it out as a binary shard file.
5. Reuse the same array for the next shard, overwriting its contents.

This continues until we've processed all documents. We'll choose a shard size of **100 million tokens**:

```python
with mp.Pool(nprocs) as pool:
    shard_size = int(1e8)
    all_tokens_np = np.empty((shard_size,), dtype=np.uint16)
    token_count = 0
    for tokens in pool.imap(tokenize, fw, chunksize=16):
        if token_count + len(tokens) < shard_size:
            all_tokens_np[token_count:token_count + len(tokens)] = tokens
            token_count += len(tokens)
        else:
            remainder = shard_size - token_count
            all_tokens_np[token_count:token_count + remainder] = tokens[:remainder]
```

---

### 1.7. Shard File Naming

We'll store shard files in the same `GPT-2` folder, named like:

- `edufineweb_train_000000.bin`
- `edufineweb_train_000001.bin`
- …

```python
DATA_CACHE_DIR = os.path.join(os.path.dirname(__file__), '.')
shard_index = 0
```

Then build the filename with zero‑padded indices:

```python
filename = os.path.join(DATA_CACHE_DIR, f"edufineweb_train_{shard_index:06d}.bin")
```

---

### 1.8. Writing Shards in Binary Format

We want to write our NumPy arrays directly to disk in binary format. NumPy provides `tofile` for this.

```python
def write_datafile(filename, tokens_np):
    tokens_np.tofile(filename)
```

Here's the **full data preparation pipeline**, including edge case handling for the last (possibly partially filled) shard:

```python
from datasets import load_dataset
import os
import multiprocessing as mp
import tiktoken
import numpy as np

DATA_CACHE_DIR = os.path.join(os.path.dirname(__file__), '.')
nprocs = max(1, os.cpu_count() // 2)

def tokenize(doc):
    enc = tiktoken.get_encoding('gpt2')
    eot = enc._special_tokens['<|endoftext|>']
    tokens = [eot]
    tokens.extend(enc.encode_ordinary(doc["text"]))
    tokens_np = np.array(tokens)
    return tokens_np.astype(np.uint16)

def write_datafile(filename, tokens_np):
    tokens_np.tofile(filename)

fw = load_dataset("HuggingFaceFW/fineweb-edu", name="sample-10BT", split="train", streaming=True)

with mp.Pool(nprocs) as pool:
    shard_size = int(1e8)
    shard_index = 0
    all_tokens_np = np.empty((shard_size,), dtype=np.uint16)
    token_count = 0

    for tokens in pool.imap(tokenize, fw, chunksize=16):
        if token_count + len(tokens) < shard_size:
            all_tokens_np[token_count:token_count + len(tokens)] = tokens
            token_count += len(tokens)
        else:
            remainder = shard_size - token_count
            all_tokens_np[token_count:token_count + remainder] = tokens[:remainder]
            filename = os.path.join(DATA_CACHE_DIR, f"edufineweb_train_{shard_index:06d}.bin")
            write_datafile(filename, all_tokens_np)
            shard_index += 1
            token_count = len(tokens) - remainder
            all_tokens_np[0:token_count] = tokens[remainder:]

    if token_count != 0:
        filename = os.path.join(DATA_CACHE_DIR, f"edufineweb_train_{shard_index:06d}.bin")
        write_datafile(filename, all_tokens_np[:token_count])

print("Done!")
```

After running this script, your `GPT-2` folder will contain around 100 `.bin` files of tokenized data shards. Make sure:

- You have enough disk space.
- Your OS has enough CPU cores to handle this workload efficiently.

This completes **Step 1: Data Preparation**.

---

## 2. Building the Model Architecture

Before going further, if you don't have a solid understanding of the Transformer architecture, pause here and read the original [Transformer paper](https://arxiv.org/abs/1706.03762), with a focus on the decoder block.

We'll try to reproduce the original **GPT‑2 (124M)** model, which has:

- 12 transformer layers
- 12 attention heads per layer

To understand the exact shapes and names of the parameters, create a new file `exp.py` and run:

```python
from transformers import GPT2LMHeadModel

model = GPT2LMHeadModel.from_pretrained("gpt2")

for name, param in model.named_parameters():
    print(name, param.shape)
```

You'll see output like:

```
transformer.wte.weight        torch.Size([50257, 768])
transformer.wpe.weight        torch.Size([1024, 768])
transformer.h.0.ln_1.weight   torch.Size([768])
transformer.h.0.ln_1.bias     torch.Size([768])
transformer.h.0.attn.c_attn.weight  torch.Size([768, 2304])
transformer.h.0.attn.c_attn.bias    torch.Size([2304])
transformer.h.0.attn.c_proj.weight  torch.Size([768, 768])
transformer.h.0.attn.c_proj.bias    torch.Size([768])
transformer.h.0.ln_2.weight   torch.Size([768])
transformer.h.0.ln_2.bias     torch.Size([768])
transformer.h.0.mlp.c_fc.weight    torch.Size([768, 3072])
transformer.h.0.mlp.c_fc.bias      torch.Size([3072])
transformer.h.0.mlp.c_proj.weight  torch.Size([3072, 768])
transformer.h.0.mlp.c_proj.bias    torch.Size([768])
...
```

Ignore the shapes for a moment and focus on the **names**. You'll notice a clear structure layer by layer (`transformer.h.0`, `transformer.h.1`, … `transformer.h.11`), each containing attention and MLP submodules, plus layer norms. This gives us a rough blueprint of the architecture we want to replicate.

> **Note:** The figure of the architecture doesn't include the final language modelling head after the final layer norm. In this discussion, the terms "Block" and "layer" are used interchangeably.

---

### 2.1. Configuration Class

We'll start by defining a `GPT2Config` class to store all model hyperparameters in one place. Instead of passing individual parameters around, we'll pass a single config object.

```python
class GPT2Config:
    def __init__(self, block_size=1024, vocab_size=50257, n_layer=12, n_head=12, n_embd=768):
        self.block_size = block_size   # Max tokens the model can process at once
        self.vocab_size = vocab_size   # Total number of tokens in vocabulary
        self.n_layer    = n_layer
        self.n_head     = n_head
        self.n_embd     = n_embd       # Embedding dimension
```

---

### 2.2. Embedding Layers

We create two embedding layers: one for **token embeddings** and one for **positional embeddings**, using the same sizes as the original GPT‑2 model.

```python
import torch
import torch.nn as nn

wte = nn.Embedding(config.vocab_size, config.n_embd)  # Token embeddings
wpe = nn.Embedding(config.block_size, config.n_embd)  # Positional embeddings
```

These two embeddings will later be added together to form the final input representation for each token at each position.

---

### 2.3. LayerNorm (`ln_1`)

After the embeddings, the first component inside each transformer layer is a `LayerNorm`, defined as `ln_1`.

```python
ln_1 = nn.LayerNorm(config.n_embd)
```

---

### 2.4. Attention Sub-module

The attention submodule (`attn`) contains `c_attn` and `c_proj`.

```python
class CausalSelfAttention(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.c_attn = nn.Linear(config.n_embd, 3 * config.n_embd)
        self.c_proj = nn.Linear(config.n_embd, config.n_embd)
```

---

### 2.5. LayerNorm (`ln_2`)

A second `LayerNorm` (`ln_2`) appears after the attention submodule and before the MLP.

```python
ln_2 = nn.LayerNorm(config.n_embd)
```

---

### 2.6. MLP Sub-module

Each transformer layer contains an MLP (feed‑forward network) composed of two linear layers: `c_fc` (the expansion layer) and `c_proj` (the projection back down).

```python
class MLP(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.c_fc   = nn.Linear(config.n_embd, 4 * config.n_embd)
        self.c_proj = nn.Linear(4 * config.n_embd, config.n_embd)
```

---

### 2.7. Transformer Block

We can now group `ln_1`, attention, `ln_2`, and MLP into a `Block` class, representing one layer in the stack.

```python
class Block(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.ln_1 = nn.LayerNorm(config.n_embd)
        self.attn = CausalSelfAttention(config)
        self.ln_2 = nn.LayerNorm(config.n_embd)
        self.mlp  = MLP(config)
```

This matches the structure of each `transformer.h.i` block in GPT‑2 (for i = 0 … 11 in the 124M model).

---

### 2.8. Final Layer Norm

After all transformer blocks, GPT‑2 applies one final `LayerNorm`, named `ln_f`.

```python
ln_f = nn.LayerNorm(config.n_embd)
```

---

### 2.9. GPT-2 Class

We tie everything together into a `GPT2` model class. The `transformer` container holds the embeddings, the stack of blocks, and the final `LayerNorm`.

```python
import torch
import torch.nn as nn

class GPT2Config:
    def __init__(self, block_size=1024, vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
        self.block_size = block_size
        self.vocab_size = vocab_size
        self.n_layer    = n_layer
        self.n_head     = n_head
        self.n_embd     = n_embd

class GPT2(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(config.vocab_size, config.n_embd),
            wpe = nn.Embedding(config.block_size, config.n_embd),
            h   = nn.ModuleList([Block(config) for _ in range(config.n_layer)]),
            ln_f = nn.LayerNorm(config.n_embd),
        ))

class Block(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.ln_1 = nn.LayerNorm(config.n_embd)
        self.attn = CausalSelfAttention(config)
        self.ln_2 = nn.LayerNorm(config.n_embd)
        self.mlp  = MLP(config)

class CausalSelfAttention(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.c_attn = nn.Linear(config.n_embd, 3 * config.n_embd)
        self.c_proj = nn.Linear(config.n_embd, config.n_embd)

class MLP(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.c_fc   = nn.Linear(config.n_embd, 4 * config.n_embd)
        self.c_proj = nn.Linear(4 * config.n_embd, config.n_embd)
```

---

### 2.10. Forward Pass — `GPT2`

Assume the input `idx` has shape `[B, T]`, where `B` is the batch size and `T` is the sequence length.

Data flows through the model in this order:

```
idx → wte → (+wpe) → h0 → h1 → … → h11 → ln_f
```

The complete forward pass:

```python
def forward(self, idx):
    B, T = idx.size()
    x   = self.transformer.wte(idx)
    pos = torch.arange(0, T, device=idx.device)
    x  += self.transformer.wpe(pos)
    for block in self.transformer.h:
        x = block(x)
    x = self.transformer.ln_f(x)
    return x
```

> Positional embeddings are the same for every sequence in the batch (positions 0 to T-1) and broadcast automatically when added to the token embeddings.

---

### 2.11. Forward Pass — `Block`

```python
def forward(self, x):
    x = self.ln_1(x)
    x += self.attn(x)
    x = self.ln_2(x)
    x += self.mlp(x)
    return x
```

---

### 2.12. Forward Pass — `CausalSelfAttention`

After the embedding layers and `LayerNorm`, the input has shape `(B, T, n_embd)`.

Instead of three separate Q, K, V projection layers, GPT-2 uses a single layer with `3 * n_embd` output features, then splits the result:

```python
def forward(self, x):
    B, T, C = x.size()
    x = self.c_attn(x)
    q, k, v = x.split(C, dim=2)

    # Split across heads: (B, T, n_head, head_dim) → (B, n_head, T, head_dim)
    q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
    k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
    v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)

    # Attention
    att = (q @ k.transpose(-2, -1)) / math.sqrt(k.size(-1))
    att = att.masked_fill(mask == 0, float('-inf'))
    att = F.softmax(att, dim=-1)
    out = att @ v

    # Concatenate heads: (B, n_head, T, head_dim) → (B, T, C)
    y = out.transpose(1, 2).contiguous().view(B, T, C)
    return y
```

**Why `.contiguous().view()`?**

PyTorch stores tensor data as a flat 1D array in memory. `view()` only changes the metadata — it doesn't rearrange memory. `transpose()` changes the metadata so the tensor is no longer contiguous. Calling `.contiguous()` first forces a memory copy that makes the layout match the metadata, allowing `.view()` to work correctly.

---

### 2.13. Forward Pass — `MLP`

```python
def forward(self, x):
    x = self.c_fc(x)
    x = self.gelu(x)
    x = self.c_proj(x)
    return x
```

Two things to note that can't be inferred just from the parameter names:

1. **Non-linearity**: GPT-2 uses GeLU (approximate `tanh` version) between `c_fc` and `c_proj`.
2. **Residual connections**: These are applied in the `Block` forward pass (the `+=` additions).

```python
class MLP(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.c_fc   = nn.Linear(config.n_embd, 4 * config.n_embd)
        self.gelu   = nn.GELU(approximate='tanh')
        self.c_proj = nn.Linear(4 * config.n_embd, config.n_embd)
```

> We use the approximate version of GeLU because it's computationally cheaper.

---

## 3. Defining the DataLoader Class

Every time we create a new `DataLoader` object, we sort all shard files in order, initialise `shard_idx` and `pos` to zero, and load the first shard.

```python
import numpy as np
import os

class DataLoader:
    def __init__(self, B, T):
        self.B = B
        self.T = T
        files = sorted([x for x in os.listdir('.') if x.endswith('.bin')])
        if len(files) == 0:
            raise FileNotFoundError("No .bin files found")
        self.shards   = files
        self.shard_idx = 0
        self.tokens    = self.load_tokens(self.shards[self.shard_idx])
        self.pos       = 0
```

Since tokens were saved as `uint16`, we read them back with `np.fromfile`, upcast to `uint64`, then convert to a `torch.long` tensor. (`nn.Embedding` requires `int64` indices.)

```python
    def load_tokens(self, filename):
        npt = np.fromfile(filename, dtype=np.uint16)
        return torch.tensor(npt.astype(np.uint64), dtype=torch.long)
```

**How batching works:**

Tokens are laid out flat. For a batch of shape `(B=2, T=4)`, we take a buffer of `B*T + 1` tokens, then split it into inputs `x` and targets `y` (offset by one position):

```
buf  = [209, 30, 612, 1881, 45, 209, 30, 612, 1881, ...]
x    = buf[:-1].view(B, T)   ← what the model sees
y    = buf[1: ].view(B, T)   ← what the model should predict
```

```python
    def next_batch(self):
        B, T = self.B, self.T
        if self.pos + B * T + 1 > len(self.tokens):
            self.shard_idx = (self.shard_idx + 1) % len(self.shards)
            self.tokens    = self.load_tokens(self.shards[self.shard_idx])
            self.pos       = 0
        buf  = self.tokens[self.pos : self.pos + B * T + 1]
        x, y = buf[:-1].view(B, T), buf[1:].view(B, T)
        self.pos += B * T
        return x, y
```

The modulo `%` ensures that after completing one full epoch, training cycles back to the first shard.

---

## 4. Implementing Loss Calculation

The model's output (`logits`) has shape `(B, T, vocab_size)`. `F.cross_entropy` expects a 2D input and 1D targets, so we flatten:

```
logits:  (B, T, vocab_size) → (B*T, vocab_size)
targets: (B, T)             → (B*T,)
```

Cross entropy for each position:

1. Convert logits to probabilities via softmax.
2. Pick the probability of the correct token.
3. Take the negative log.

Then average over all positions.

```python
loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
```

**Weight tying:** The final logit projection maps `(B, T, n_embd) → (B, T, vocab_size)`. GPT-2 reuses the token embedding matrix `wte` for this (called weight tying), saving ~38M parameters.

```python
self.lm_head = nn.Linear(config.n_embd, config.vocab_size, bias=False)
self.transformer.wte.weight = self.lm_head.weight  # tie weights
```

The updated forward pass:

```python
def forward(self, idx, targets):
    B, T = idx.size()
    x   = self.transformer.wte(idx)
    pos = torch.arange(0, T, device=idx.device)
    x  += self.transformer.wpe(pos)
    for block in self.transformer.h:
        x = block(x)
    x      = self.transformer.ln_f(x)
    logits = self.lm_head(x)
    loss   = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
    return logits, loss
```

---

## 5. Flash Attention — Better Attention Calculation

The manual attention implementation materialises the full `(B, n_head, T, T)` attention matrix in GPU memory, causing many slow round-trips between HBM and the compute units.

**Flash Attention** operates entirely inside fast on-chip SRAM, processing in small tiles and never storing the full matrix:

```python
# Replace this:
att = (q @ k.transpose(-2, -1)) / math.sqrt(k.size(-1))
att = att.masked_fill(mask == 0, float('-inf'))
att = F.softmax(att, dim=-1)
out = att @ v

# With this (same math, much faster):
y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
```

Updated `CausalSelfAttention.forward`:

```python
def forward(self, x):
    B, T, C = x.size()
    x = self.c_attn(x)
    q, k, v = x.split(C, dim=2)
    q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
    k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
    v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
    y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
    y = y.transpose(1, 2).contiguous().view(B, T, C)
    return y
```

---

## 6. Implementing the Optimizer

The optimizer's job: given the gradients, decide how much to update each weight.

**SGD** (baseline):
```
new_weight = old_weight - learning_rate * gradient
```

Simple but slow, treats all parameters equally, and is sensitive to learning rate.

**Adam** improves on SGD by tracking two quantities per parameter:

```
m_t = β1 × m_{t-1} + (1 - β1) × gradient        # momentum
v_t = β2 × v_{t-1} + (1 - β2) × gradient²       # variance

weight = weight - lr × m / (sqrt(v) + eps)
```

This adapts the learning rate per parameter — consistent gradients get larger updates; noisy gradients get smaller updates.

We use **AdamW** (Adam + weight decay). Weight decay adds a small pull toward zero on every step:

```
weight = weight × (1 - weight_decay) - lr × gradient
```

This forces the model to only keep weights that are consistently useful, preventing overfitting.

**Selective weight decay:** We don't apply weight decay to biases or LayerNorm parameters (they have `dim < 2`):

```python
def configure_optimizers(self, weight_decay, learning_rate):
    param_dict    = {pn: p for pn, p in self.named_parameters()}
    decay_params  = [p for n, p in param_dict.items() if p.dim() >= 2]
    nodecay_params = [p for n, p in param_dict.items() if p.dim() < 2]
    optim_groups  = [
        {'params': decay_params,   'weight_decay': weight_decay},
        {'params': nodecay_params, 'weight_decay': 0.0},
    ]
    return torch.optim.AdamW(optim_groups, lr=learning_rate, betas=(0.9, 0.95), eps=1e-8)
```

---

## 7. Weight Initialisation

**Target starting loss:** The worst possible loss is `log(vocab_size) ≈ log(50257) ≈ 10.82` — when the model assigns equal probability to every token. We want training to start here and improve.

To achieve a uniform starting distribution, weights need to be small. Exactly zero weights cause the **symmetry problem** (all neurons compute the same thing and receive identical gradients), so we use small random normal values:

```python
torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
```

The `std=0.02` value comes from the original GPT-2 paper.

**Scaled projection layers:** With residual connections, the variance of the residual stream accumulates across all `N` additions (2 per layer: one from attention, one from MLP). To keep the final variance stable, we scale down the output projections:

```
std = 0.02 × (2 × n_layer)^(-0.5)
    = 0.02 / sqrt(24)  for a 12-layer model
```

We mark projection layers with a custom attribute and apply the scaled initialisation:

```python
# In CausalSelfAttention and MLP __init__:
self.c_proj.NANOGPT_SCALE_INIT = 1.0

# In GPT2._init_weights:
def _init_weights(self, module):
    if isinstance(module, nn.Linear):
        std = 0.02
        if hasattr(module, 'NANOGPT_SCALE_INIT'):
            std *= (2 * self.config.n_layer) ** -0.5
        torch.nn.init.normal_(module.weight, mean=0.0, std=std)
        if module.bias is not None:
            torch.nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Embedding):
        torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
```

`self.apply(_init_weights)` walks through every module in the network recursively and applies the function.

---

## 8. Training Optimisations

### 8.1. Gradient Accumulation

With `B=16, T=1024`, each step processes only 16,384 tokens — an extremely noisy gradient estimate. We want to simulate a much larger effective batch size (e.g., `B=512, T=1024 = 524,288 tokens`) while keeping memory usage constant.

**Gradient accumulation** runs 32 micro-steps with `B=16` before calling `optimizer.step()`, accumulating gradients along the way.

```python
total_batch_size  = 524288
B, T              = 16, 1024
grad_accum_steps  = total_batch_size // (B * T)  # = 32

optimizer.zero_grad()
for micro_step in range(grad_accum_steps):
    x, y       = train_loader.next_batch()
    logits, loss = model(x, y)
    loss        = loss / grad_accum_steps   # average gradients across steps
    loss.backward()
optimizer.step()
```

Dividing loss by `grad_accum_steps` ensures the accumulated gradient is equivalent to the average over one large batch.

---

### 8.2. `torch.set_float32_matmul_precision('high')` — TF32

Modern NVIDIA GPUs have **Tensor Cores** alongside regular CUDA cores. Tensor Cores operate on specific data types and perform a fused matrix-multiply-accumulate (`D = A × B + C`) in a single hardware step.

FP32 (32-bit float) doesn't natively fit into Tensor Core registers. Setting:

```python
torch.set_float32_matmul_precision('high')
```

…tells PyTorch to truncate FP32 inputs to **TF32** (19-bit mantissa) before passing them to Tensor Cores, while accumulating results in full FP32. The precision loss is negligible in practice but the speed gain is significant.

---

### 8.3. `vocab_size = 50304`

The actual GPT-2 vocabulary is 50,257 tokens. Why use 50,304 (adding 47 fake tokens)?

**GPU memory alignment.** When computing the final LM head matrix multiply `(B×T, n_embd) × (n_embd, vocab_size)`, GPU threads are grouped into **warps** of 32. A warp computes 32 output columns at a time.

With `vocab_size = 50257`:

```
50257 / 32 = 1570.53...  ← not divisible
```

The last warp covers columns 50240–50271, but columns 50257–50271 don't exist. This forces a boundary check in every thread, causing **warp divergence** — 15 of 32 threads sit idle each time that warp runs, for every training step.

With `vocab_size = 50304`:

```
50304 / 32 = 1572  ← exactly divisible
```

Every warp covers exactly 32 valid columns. No divergence, no wasted threads.

---

### 8.4. `torch.compile`

Python executes line by line — it launches a GPU kernel for each individual operation, then waits. This causes repeated CPU-GPU round-trips and leaves the GPU underutilised.

`torch.compile` solves this in three stages:

**Stage 1 — Graph capture:** On the first forward pass, instead of executing immediately, it records every operation into a computation graph.

**Stage 2 — Optimisation:** With the full graph visible, it applies **kernel fusion** — combining multiple sequential operations (e.g., linear → GeLU → linear) into a single GPU kernel, eliminating intermediate memory writes and reads.

**Stage 3 — Code generation (Triton kernels):** PyTorch's built-in kernels are general-purpose and handle all possible shapes and types. `torch.compile` uses Triton to generate **custom kernels** for our model's exact shapes, eliminating all the generalisation overhead.

```python
model = torch.compile(model)
```

---

## 9. Training Loop

For 10B tokens with a `total_batch_size` of 524,288:

```
max_steps = 10,000,000,000 / 524,288 ≈ 19,073
```

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

total_batch_size = 524288
B, T             = 16, 1024
grad_accum_steps = total_batch_size // (B * T)
max_steps        = 19073

torch.set_float32_matmul_precision('high')

model    = GPT2(GPT2Config())
loader   = DataLoader(B, T)
optimizer = model.configure_optimizers(weight_decay=0.1, learning_rate=6e-4)
model    = torch.compile(model)

for step in range(max_steps):
    optimizer.zero_grad()
    for micro_step in range(grad_accum_steps):
        x, y         = loader.next_batch()
        logits, loss = model(x, y)
        loss         = loss / grad_accum_steps
        loss.backward()
    optimizer.step()
```

> We haven't yet defined the **learning rate schedule** — that's the next step.
