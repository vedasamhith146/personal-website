# How i trained my own GPT-2(124M) on Fine-web Edu dataset  
  
So, what do you actually need to train a model yourself?  
• A good dataset  
• Enough compute  
• Some coding skills  
I like to code by breaking everything down clearly. If you write a line of code, you must know what it does exactly. In this training process, the base code isn’t the difficult part. The interesting and important part is the set of optimisations we apply to utilise our compute fully.  
Let’s go step by step.  
  
1. Data Preparation  
First, you have to choose the dataset you’ll train your model on.  
I chose FineWeb‑Edu‑10BT (specifically the ‘sample-10BT’ subset), the same dataset Andrej uses. FineWeb‑Edu is considered a good dataset for training small language models like GPT-2.  
1.1. Project Setup  
Open VS Code and:  
1. Create a new folder named ‘GPT-2’.  
2. Inside it, create a new file named ‘fineweb.py’.  
We’ll import libraries gradually as we need them (even though, for readability, they’re usually grouped at the top of the file). This way, it’s easier to explain everything from scratch.  
1.2. Loading the Dataset  
Python has a dedicated Hugging Face library called ‘datasets’ for working with datasets. We’ll use its ‘load_dataset’ function.  
```
from datasets import load_dataset

```
Some important parameters of ‘load_dataset’:  
• path: Which dataset to load. In our case: “HuggingFaceFW/fineweb-edu”.  
• name: Which version/subset of the dataset to use. Here: “sample-10BT”.  
• split: Which split to load, “train”, “test”, or “validation”. Since we’re training, we’ll use “train”.  
• streaming: If ‘True’, data is streamed instead of fully downloaded to disk. This is crucial if you don’t have enough disk space. With ‘streaming=True’, documents are downloaded in small chunks, processed, and then discarded.  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)

```
Now we have raw text, but we still need to tokenize it so we can feed it into the model.  
1.3. Tokenization and Multiprocessing  
Tokenization is typically CPU‑bound work. To tokenize faster, we want to use as many CPU cores as possible; this is where multiprocessing comes in. It lets us tokenize multiple documents simultaneously.  
![Fiat. A rouch ilustration of multiprocessind](/gpt2/6E024AE5D86B43D9BE53FBA39942401A.png)  
To do this, we’ll use Python’s ‘os’ and ‘multiprocessing’ libraries.  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp

```
The function ‘cpu_count()’ returns the number of logical cores, not physical cores. For example, if your CPU has 4 physical cores but supports Hyper-Threading, the OS might see 8 logical cores. In practice, we often only use half the logical cores (i.e., the number of physical cores) for better performance.  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
nprocs=max(1,os.cpu_count()//2)

```
1.4. Using ‘Pool’ ‘Pool’ lets us run Python processes in parallel. When we create a ‘Pool’ with ‘nprocs’ workers, it spins up that many worker processes once; they stay alive and process many documents.  
![(Main Process](/gpt2/1BAA138A9A484C12A79B6C624D7C50CF.png)  
We’ll also use ‘Pool.imap’, which is a streaming version of ‘Pool.map’:  
• ‘Pool.map(func, iterable)’ computes all results and returns them as a list (waits for everything).  
• ‘Pool. imap(func, iterable, chunksize=…)’ returns an iterator and yields results as they are ready, in order.  
We want streaming behaviour (just like ‘streaming=True’ for the dataset) so we don’t keep everything in memory at once.  
The parameters for ‘Pool.imap’ in our case are:  
• ‘func’: the tokenizer function  
• ‘iterable’: the dataset iterator `fw`  
• ‘chunksize’: how many documents each worker receives per batch to reduce inter‑process communication cost  
![Worker • Main: "Give me a doc"](/gpt2/A534CAB1C7F54D7CAED3B336CC377502.png)  
![Morker + Main: *Oive me work](/gpt2/6E9EF420D83F42A88B04A1A5FCFEF521.png)  
‘chunksize=16’ is a commonly used, reasonable choice:  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
nprocs=max(1,os.cpu_count()//2)

with mp.Pool(nprocs) as pool:
    pool.imap(tokenize,fw,chunksize=16)

```
Note that we haven’t defined ‘tokenize’ yet.  
1.5. Defining the Tokenizer Function  
We want our ‘tokenize’ function to:  
• Take a single document as input.  
• Return a NumPy array of token IDs.  
• Prepend a special ‘<|endoftext|>’ token to separate documents.  
We’ll use the ‘tiktoken’ library to get the GPT‑2 tokenizer.  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
import tiktoken
nprocs=max(1,os.cpu_count()//2)

def tokenize(doc):
  enc=tiktoken.get_encoding('gpt-2')
  eot=enc._special_tokens['<|endoftext|>']
  tokens=[eot]
  tokens.extend(enc.encode_ordinary(doc["text"]))

```
```
  tokens_np=np.array(tokens)
  return tokens_np.astype(np.uint16)

```
```



with mp.Pool(nprocs) as pool:
    pool.imap(tokenize,fw,chunksize=16)

```
A few important notes:  
1. ‘encode_ordinary’ ignores special tokens, so our explicit ‘<|endoftext|>’ stays at the start of each document and doesn’t appear inside the text.  
2. We access ‘doc[“text”]’ because each document is a dictionary like ‘{ “text”: …, “url”: … }’.  
3. We use ‘np.uint16’ because it uses only 2 bytes per token ID, which saves memory and disk space.  
‘imap’ returns an iterator of token arrays. On the first iteration, you get tokens for ‘doc1’; on the second iteration, ‘doc2’; and so on.  
![Subaitted: does. d0s2. dos3, doce, does](/gpt2/4CED8CE0AFBB42408D68638271EB36B5.png)  
1.6. Sharding Tokens into Binary Files  
We don’t want to keep all tokens in memory. Instead, we:  
1. Create a large NumPy array that can hold a fixed number of tokens (e.g., 100 million).  
2. Stream token arrays from ‘pool.imap’.  
3. Fill the large array with tokens.  
4. Once the array is full, write it out as a binary shard file.  
5. Reuse the same array for the next shard, overwriting its contents.  
This continues until we’ve processed all documents.  
We’ll choose a shard size of 100 million tokens:  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
import tiktoken
nprocs=max(1,os.cpu_count()//2)

def tokenize(doc):
  enc=tiktoken.get_encoding('gpt-2')
  eot=enc._special_tokens['<|endoftext|>']
  tokens=[eot]
  tokens.extend(enc.encode_ordinary(doc["text"]))
  tokens_np=np.array(tokens)
  return tokens_np.astype(np.uint16)

with mp.Pool(nprocs) as pool:
    shard_size=int(1e8)
    all_tokens_np=np.empty((shard_size,),dtype=np.uint16)
    pool.imap(tokenize,fw,chunksize=16)

```
Now we add a loop to actually fill ‘all_tokens_np’ and track how many tokens are currently stored using ‘token_count’:  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
import tiktoken
nprocs=max(1,os.cpu_count()//2)

def tokenize(doc):
  enc=tiktoken.get_encoding('gpt-2')
  eot=enc._special_tokens['<|endoftext|>']
  tokens=[eot]
  tokens.extend(enc.encode_ordinary(doc["text"]))
  tokens_np=np.array(tokens)
  return tokens_np.astype(np.uint16)

with mp.Pool(nprocs) as pool:
    shard_size=int(1e8)
    all_tokens_np=np.empty((shard_size,),dtype=np.uint16)
    token_count=0
    for tokens in pool.imap(tokenize,fw,chunksize=16):
      if token_count + len(tokens) < shard_size:
        all_tokens_np[token_count:token_count+len(tokens)]= tokens
        token_count+=len(tokens)
      else:
        remainder=shard_size-token_count
        all_tokens_np[token_count:token_count+remainder]=tokens[:remainder]
      # now this array is full, we need to save it to the disk, for that first 
      # We need to create a new file in our VS Code workspace in the same folder.
      
      

```
We’ll store shard files in the same ‘GPT-2’ folder, and name them like:  
• `edufineweb_train_000000.bin`  
• `edufineweb_train_000001.bin`  
• …  
First, define the directory and a helper variable for the shard index:  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
import tiktoken
nprocs=max(1,os.cpu_count()//2)

# path to create file 
DATA_CACHE_DIR=os.path.join(os.path.dirname(__file__), '.')


def tokenize(doc):
  enc=tiktoken.get_encoding('gpt-2')
  eot=enc._special_tokens['<|endoftext|>']
  tokens=[eot]
  tokens.extend(enc.encode_ordinary(doc["text"]))
  tokens_np=np.array(tokens)
  return tokens_np.astype(np.uint16)

with mp.Pool(nprocs) as pool:
    shard_size=int(1e8)
    all_tokens_np=np.empty((shard_size,),dtype=np.uint16)
    token_count=0
    for tokens in pool.imap(tokenize,fw,chunksize=16):
      if token_count + len(tokens) < shard_size:
        all_tokens_np[token_count:token_count+len(tokens)]= tokens
        token_count+=len(tokens)
      else:
        remainder=shard_size-token_count
        all_tokens_np[token_count:token_count+remainder]=tokens[:remainder]
      
      

```
We’ll track shard indices with ‘shard_index’:  
Then we’ll build the filename with zero‑padded indices:  
  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
import tiktoken
nprocs=max(1,os.cpu_count()//2)

# path to create file 
DATA_CACHE_DIR=os.path.join(os.path.dirname(__file__), '.')

def tokenize(doc):
  enc=tiktoken.get_encoding('gpt-2')
  eot=enc._special_tokens['<|endoftext|>']
  tokens=[eot]
  tokens.extend(enc.encode_ordinary(doc["text"]))
  tokens_np=np.array(tokens)
  return tokens_np.astype(np.uint16)

with mp.Pool(nprocs) as pool:
    shard_size=int(1e8)
    shard_index=0
    all_tokens_np=np.empty((shard_size,),dtype=np.uint16)
    token_count=0
    for tokens in pool.imap(tokenize,fw,chunksize=16):
      if token_count + len(tokens) < shard_size:
        all_tokens_np[token_count:token_count+len(tokens)]= tokens
        token_count+=len(tokens)
      else:
        remainder=shard_size-token_count
        all_tokens_np[token_count:token_count+remainder]=tokens[:remainder]
        filename=os.path.join(DATA_CACHE_DIR,f"edufineweb_train_{shard_index:06d}.bin")
      

```
1.8. Writing Shards in Binary Format  
We want to write our NumPy arrays directly to disk in binary format. NumPy provides ‘tofile’ for this.  
Define a small helper:  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
import tiktoken
nprocs=max(1,os.cpu_count()//2)

# path to create file 
DATA_CACHE_DIR=os.path.join(os.path.dirname(__file__), '.')

def tokenize(doc):
  enc=tiktoken.get_encoding('gpt-2')
  eot=enc._special_tokens['<|endoftext|>']
  tokens=[eot]
  tokens.extend(enc.encode_ordinary(doc["text"]))
  tokens_np=np.array(tokens)
  return tokens_np.astype(np.uint16)

def write_datafile(filename,tokens_np):
  tokens_np.tofile(filename)
  

with mp.Pool(nprocs) as pool:
    shard_size=int(1e8)
    shard_index=0
    all_tokens_np=np.empty((shard_size,),dtype=np.uint16)
    token_count=0
    for tokens in pool.imap(tokenize,fw,chunksize=16):
      if token_count + len(tokens) < shard_size:
        all_tokens_np[token_count:token_count+len(tokens)]= tokens
        token_count+=len(tokens)
      else:
        remainder=shard_size-token_count
        all_tokens_np[token_count:token_count+remainder]=tokens[:remainder]
        filename=os.path.join(DATA_CACHE_DIR,f"edufineweb_train_{shard_index:06d}.bin")
      

```
Now we can write the filled shard to disk, increment the shard index, and reuse the array.  
Here’s the full data preparation pipeline, including the edge case handling for the last (possibly partially filled) shard:  
```
from datasets import load_dataset
fw=load_dataset(HuggingFaceFW/fineweb-edu, name="sample-10BT", split="train",streaming=True)
import os
import multiprocessing as mp
import tiktoken
nprocs=max(1,os.cpu_count()//2)

# path to create file 
DATA_CACHE_DIR=os.path.join(os.path.dirname(__file__), '.')

def tokenize(doc):
  enc=tiktoken.get_encoding('gpt-2')
  eot=enc._special_tokens['<|endoftext|>']
  tokens=[eot]
  tokens.extend(enc.encode_ordinary(doc["text"]))
  tokens_np=np.array(tokens)
  return tokens_np.astype(np.uint16)

def write_datafile(filename,tokens_np):
  tokens_np.tofile(filename)

with mp.Pool(nprocs) as pool:
    shard_size=int(1e8)
    shard_index=0
    all_tokens_np=np.empty((shard_size,),dtype=np.uint16)
    token_count=0
    for tokens in pool.imap(tokenize,fw,chunksize=16):
      if token_count + len(tokens) < shard_size:
        all_tokens_np[token_count:token_count+len(tokens)]= tokens
        token_count+=len(tokens)
      else:
        remainder=shard_size-token_count
        all_tokens_np[token_count:token_count+remainder]=tokens[:remainder]
        filename=os.path.join(DATA_CACHE_DIR,f"edufineweb_train_{shard_index:06d}.bin")
        write_datafile(filename,all_tokens_np)
        shard_index+=1
        token_count=len(tokens)-remainder
        all_tokens_np[0:token_count]=tokens[remainder:]
    
   if token_count!=0:
      filename=os.path.join(DATA_CACHE_DIR,f"edufineweb_train_{shard_index:06d}.bin")
      write_datafile(filename,all_tokens_np[:token_count])

print("Done!")

```
![for tokens in pooi.Jeapl)](/gpt2/088A64D387BB4DB7A8EB8F3E3C582FAB.png)  
After running this script, your ‘GPT-2’ folder will contain around 100 ‘.bin’ files containing tokenized data shards.Make sure:  
• You have enough disk space.  
• Your OS has enough CPU cores to handle this workload efficiently.  
This completes Step 1: Data Preparation.  
  
2. Building Model Architecture  
Before going further, if you don’t have a solid understanding of the Transformer architecture, pause here and read the original ++[Transformer paper](https://www.google.com/url?sa=t&rct=j&opi=89978449&url=https%3A%2F%2Farxiv.org%2Fabs%2F1706.03762&ved=2ahUKEwiC9tGA66aUAxXKi68BHeqpJAcQFnoECAwQAQ&usg=AOvVaw2ceXGQohV5Kx51VSkfkG08)++, with a focus on the decoder block.  
We’ll try to reproduce the original GPT‑2 (124M) model, which has:  
• 12 transformer layers  
• 12 attention heads per layer  
To understand the exact shapes and names of the parameters, create a new file ‘exp.py’ and run:  
```
from transformers import GPT2LMHeadModel

# Load GPT-2 (124M)
model = GPT2LMHeadModel.from_pretrained("gpt2")

# Print all named parameters
for name, param in model.named_parameters():
    print(name, param.shape)

```
You’ll see output like:  
```
transformer.wte.weight torch.Size([50257, 768])
transformer.wpe.weight torch.Size([1024, 768])
transformer.h.0.ln_1.weight torch.Size([768])
transformer.h.0.ln_1.bias torch.Size([768])
transformer.h.0.attn.c_attn.weight torch.Size([768, 2304])
transformer.h.0.attn.c_attn.bias torch.Size([2304])
transformer.h.0.attn.c_proj.weight torch.Size([768, 768])
transformer.h.0.attn.c_proj.bias torch.Size([768])
transformer.h.0.ln_2.weight torch.Size([768])
transformer.h.0.ln_2.bias torch.Size([768])
transformer.h.0.mlp.c_fc.weight torch.Size([768, 3072])
transformer.h.0.mlp.c_fc.bias torch.Size([3072])
transformer.h.0.mlp.c_proj.weight torch.Size([3072, 768])
transformer.h.0.mlp.c_proj.bias torch.Size([768])

```
```
.
.
.
.

```
Ignore the shapes for a moment and focus on the names. You’ll notice a clear structure, layer by layer (e.g., ‘transformer.h.0’, ‘transformer.h.1’, … ‘transformer.h.11’), each containing attention and MLP submodules, plus layer norms.  
This gives us a rough blueprint of the GPT‑2 (124M) transformer architecture we want to replicate.  
![Screenshot 2026-06-16 at 3.41.02 PM.png](/gpt2/8DF0A58244124DC198BBF580EBBB7085.png)  
Note that the above figure doesn’t include the final language modelling head after the final layer norm.  
In this dicussion i will use the terms ‘Block’ and ‘layer’ interchangeably.  
2.1. Configuration Class  
We’ll start by defining a ‘GPT2Config’ class to store all model hyperparameters in one place. Instead of passing individual parameters around, we’ll pass a single config object.  
```
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50257, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

```
‘block_size’ denotes the maximum number of tokens the model can process at once.  
‘vocab_size’ denotes the total number of tokens in our vocabulary.  
‘n_embd’ denotes the embedding dimension.  
Now that ‘GPT2Config’ is defined, we can pass this config object into our model classes and extract whatever parameters we need (instead of passing ‘n_layer’, ‘n_head’, etc., separately).  
We’ll now build our model architecture step by step by examining the output we obtained previously. That output is very important when you’re building any model’s architecture, it shows the exact order of layers that an input passes through.  
First, we have two embedding layers, so let’s define them.  
  
2.2. Defining embedding layers  
To implement the embedding layers, we first need to import the ‘torch’ library.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

```
Next, we create two embedding layers: one for token embeddings and one for positional embeddings. We’ll use the same sizes as in the original GPT‑2 model.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)

```
Here:  
• ‘wte’ maps token IDs to their corresponding embedding vectors.  
• ‘wpe’ maps positions (from 0 to ‘block_size — 1’) to positional embedding vectors.  
These two embeddings will later be added together to form the final input representation for each token at each position.  
2.3 Defining Layernorm (ln_1)  
After the token and positional embeddings, the next component we see in the GPT‑2 architecture is a LayerNorm. We’ll define this as ‘ln_1’.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)
ln_1=nn.LayerNorm(config.n_embd)

```
‘ln_1’ will be used inside each transformer layer, before the attention submodule.  
2.4 Defining attention sub-module  
Next, we define the attention submodule, which in GPT‑2 is called ‘attn’ and internally contains ‘c_attn’ and ‘c_proj’.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)
ln_1=nn.LayerNorm(config.n_embd)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, 4*config.n_embd)

```
2.5 Defining LayerNorm(ln_2)  
Inside each transformer layer we also have a second LayerNorm, ‘ln_2’, which appears after the attention submodule and before the MLP.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)
ln_1=nn.LayerNorm(config.n_embd)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, 4*config.n_embd)

ln_2=nn.LayerNorm(config.n_embd)

```
2.6 Defining MLP sub-module  
Each transformer layer also contains an MLP (feed‑forward network) submodule. In GPT‑2, this is composed of two linear layers: ‘c_fc’ (the expansion layer) and ‘c_proj’ (the projection back down to the embedding dimension).  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)
ln_1=nn.LayerNorm(config.n_embd)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

ln_2=nn.LayerNorm(config.n_embd)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
2.7 Defining a Transformer block  
Now that we have all the components of a single transformer layer(‘ln_1’, attention, ‘ln_2’, and MLP), we can group them into a ‘Block’ class. This represents one block in the stack of GPT‑2 transformer blocks.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)
ln_1=nn.LayerNorm(config.n_embd)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

ln_2=nn.LayerNorm(config.n_embd)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=ln_1
    self.attn=CausalSelfAttention(config)
    self.ln_2=ln_2
    self.mlp=MLP(config)

```
This ‘Block’ matches the structure of each ‘transformer.h.i’ block in GPT‑2 (for i = 0, 1, …, 11 in the 124M model).  
2.8.Defining the final layer norm  
After all transformer blocks, GPT‑2 applies one final LayerNorm, often named ‘ln_f’.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)
ln_1=nn.LayerNorm(config.n_embd)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

ln_2=nn.LayerNorm(config.n_embd)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=ln_1
    self.attn=CausalSelfAttention(config)
    self.ln_2=ln_2
    self.mlp=MLP(config)

ln_f=nn.LayerNorm(config.n_embd)

```
2.9.Defining GPT-2 Class  
Finally, we can tie everything together into a ‘GPT2’ model class. Inside it, we create a ‘transformer’ container that holds the embeddings, the stack of blocks, and the final LayerNorm.  
  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

wte=nn.Embedding(config.vocab_size,config.n_embd)
wpe=nn.Embedding(config.vocab_size,config.n_embd)
ln_1=nn.LayerNorm(config.n_embd)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

ln_2=nn.LayerNorm(config.n_embd)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=ln_1
    self.attn=CausalSelfAttention(config)
    self.ln_2=ln_2
    self.mlp=MLP(config)

ln_f=nn.LayerNorm(config.n_embd)

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=wte
    wpe=wpe
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=ln_f))

```
This ‘GPT2’ class now defines the core transformer body (without yet adding the language‑model head or loss calculation).  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)


class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)


class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
2.10. Writing the forward pass for the GPT2 Class  
We now define the forward pass of the ‘GPT2’ class.  
Assume the input ‘idx’ has shape ‘[B, T]’, where ‘B’ is the batch size and ‘T’ is the sequence length.  
![8-0 [ 200.](/gpt2/50761D3EB95A4F96B45A7137C7570372.png)  
The data flows through the model in this order:  
(idx-> wte -> wpe -> h0 -> h1 ………. -> h11 -> ln_f)  
let’s pass our input through wte first:  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    
    

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
![tach token index + looks op a row in the esbedding table](/gpt2/E936544EE1954A65BFF7E4AF21B9EA81.png)  
Now, if the input is of shape [B, T], we will have the same positional embedding for every sequence in the batch, i.e., we need to sample out positional embedding from 0 to T-1, and they will broadcast automatically when we add to the token embeddings. Refer to the Fig11 and Fig 12 for more clarity.  
![Positions are just (0. 1. 2. 3) → sase for EVERY sequence in the batch](/gpt2/2C489810DFAB41CBA388037F7279F602.png)  
![tyleren breadcaste ente across d dleenales autoastically](/gpt2/42A1A745C66B4689B14C9A8C6041DB8D.png)  
The complete forward pass for class GPT2 looks something like this:  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 
    

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
Now we still haven’t written the forward pass for the block class, so let’s do that.  
2.11.Writing forward pass for the block class  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x=self.attn(x)
    x=self.ln_2(x)
    x=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
2.12. Writing forward pass for class CausalSelfAttention  
This is the core part. Usually, we have three layers (Q, K, V). But here we have defined a single layer with 3*config.n_embd out features. so we pass our input thorugh this single layer and later we split the output into 3 different tensors each of shape (config.n_embd,config.n_embd).  
Also note that after passing the input through the wte, wpe embedding layers, we pass it through the layernorm, which doesn’t change shape. so the shape of the input tensor after passing through wte,wpe and layerNorm will be (B,T, config.n_embd) ( refer to Fig 12 ) for more clarity.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x=self.attn(x)
    x=self.ln_2(x)
    x=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
In transformers we use somthing called as multi-head attention i.e we split q,k,v across heads and the attention is computed at all the heads.  
So now let’s split q,k,v across heads so that each head gets the same number of embeddings to play with.  
  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x=self.attn(x)
    x=self.ln_2(x)
    x=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head)
    k=k.view(B,T,self.n_head, C//self.n_head)
    v=v.view(B,T,self.n_head, C//self.n_head)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
Now we want to compute our attention across heads, so we transpose the first and second dimension of obtained q,k,v tensors  
  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x=self.attn(x)
    x=self.ln_2(x)
    x=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)

```
```
    self.n_head=config.n_head
  def forward(self,x):

```
```
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
Next, we do (q@k^T) , divide it by square root of dimension of head, we then apply softmax to get attention scores and then multiply them with value tensor to get a the final output .  
So you may expect that will do something like this:  
![• manual Lepienentatioe](/gpt2/B0C1741C82AE4F9B8B1198E088C7BC5F.png)  
for now, yes let’s do this but later we will use an optimised version of this.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x=self.attn(x)
    x=self.ln_2(x)
    x=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    att = (q @ k.transpose(-2, -1))         
    att = att / math.sqrt(k.size(-1))        
    att = att.masked_fill(mask == 0, -inf)   
    att = F.softmax(att, dim=-1)             
    out = att @ v  
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)

```
Note that at the last step we are concatenating outputs from all the heads to get the final output. There is something we have done if you observe, we had used contiguous() before viewing as (B,T,C) because view function needs the tensor to be contiguous let’s understand what’s happening here more clearly:  
pytorch actually stores tensor data as a flat 1D array in memory and uses metadata to interpret a multi-dimensional tensor.  
So view() only changes the metadata.  
Let’s understand what it means refer to Fig.14 below  
Press enter or click to view image in full size  
![• torch.arango(12)](/gpt2/31BD4D5A3D0E455283B05686850DDAEC.png)  
Let’s see what transpose () does to data  
![x = torch.randn(2. 3)](/gpt2/B9310CA7EEF64E08BAB41B00650726F5.png)  
some operations like .view() assume that the tensor is stored row by row in memory refer to Fig.16 to get more clarity over it  
![X_t "thinks" it 100ks 11ke:](/gpt2/E5555100D01B43319226581E0AD0C038.png)  
2.13.Writing forward pass for the class MLP  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x=self.attn(x)
    x=self.ln_2(x)
    x=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    att = (q @ k.transpose(-2, -1))         
    att = att / math.sqrt(k.size(-1))        
    att = att.masked_fill(mask == 0, -inf)   
    att = F.softmax(att, dim=-1)             
    out = att @ v  
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y      
                    
class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
  def forward(self,x):
    x=self.c_fc(x)
    x=self.c_proj(x)
    return x

```
Okay you might now think that we have done with writing the forward pass for the model but we missed up on two things let’s look at them  
1. There will be a non linearity like ReLU or GeLU after passing the input through c_fc, this we cannot know by looking at the named parameters of the model because it’s just a non linearity function.  
2. There should be a residual connections after attention layer and mlp layer.  
```
import torch
import torch.nn as nn
class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    return x 

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    att = (q @ k.transpose(-2, -1))         
    att = att / math.sqrt(k.size(-1))        
    att = att.masked_fill(mask == 0, -inf)   
    att = F.softmax(att, dim=-1)             
    out = att @ v  
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y              

```
```


```
```
class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x

```
Note that we use approximate version of GeLU because it’s easier to calculate.  
This completes our complete forward pass now, when we pass the input to the model we can get output from it.  
We have completed preparing the data in shard files, we have also completed implemented the forward pass , but to extract the input from shard files and to convert it into a tensor of B*T we need a function. So let’s define an helper for that  
  
3.Defining DataLoader class  
This is the rough view of how we process the data into the model (Fig.17)  
![1. Split the date inte sanaptable chunks (stards!](/gpt2/69AD2AD0BEF74163A0E0FFFD5FA652CE.png)  
This is what need to do: Everytime we define a new object of class ‘Data Loader’, we first sort all the shard files in the increasing order so that we can load them one by one in definte order, we intialise the shard_idx and position tracker to zero, they define the index of the current shard file and the current position in the shard file. We use a function load_tokens that will load tokens from a shardfile.  
```
import numpy as np
class DataLoader:
  def __init__(self,B,T);
    self.B=B
    self.T=T
    files=sorted([x for x in os.listdir('.') if x.endswith('.bin')])
    if len(files)==0:
      raise FileNotFoundError("No .bin files found")
    self.shards=files
    self.shard_idx=0
    self.tokens=self.load_tokens(self.shards[self.shard_idx])
    self.pos=0

```
Remember that we have stored our tokens in binary format,now we want to extract them and store them as numpy array,for that we are using the transformation ‘fromfile’ remember to convert a numpy array into binary format we have used ‘tofile’.  
Now we will convert this numpy array into a tensor of data type,torch.long which uses 8 bits instead of 2 bits which ‘uint16’ uses. This is because Pytorch’ s nn.embedding requires torch.long(int64) indices . so first we will convert this numpy array to ‘unit64’ and convert into a tensor of data type=torch.long  
```
import numpy as np
class DataLoader:
  def __init__(self,B,T);
    self.B=B
    self.T=T
    files=sorted([x for x in os.listdir('.') if x.endswith('.bin')])
    if len(files)==0:
      raise FileNotFoundError("No .bin files found")
    self.shards=files
    self.shard_idx=0
    self.tokens=self.load_tokens(self.shards[self.shard_idx])
    self.pos=0

  def load_tokens(self,filename):
    npt=np.fromfile(filename,dtype=np.uint16)
    return torch.tensor(npt.astype(np.uint64), dtype=torch.long)

```
Now self.tokens looks something like this (Fig.18):  
![Fig.18 |](/gpt2/F240A3F9F6C64174AE39F7C400923C1D.png)  
Now before going to next step let’s understand what’s happening exactly  
Imagine tokens are laid out flat(Fig.19):  
![Peestien: O](/gpt2/38341B95B5E84F45837D6BBE417BEBFD.png)  
For language modelling, at every position, the model sees tokens and predicts the next token(Fig.20):  
![(x): (209. 30. 612. 1881](/gpt2/97998D0EB75940CAB70D19B2CA9545E4.png)  
This is the autoregressive training objective: predict the next token given all previous tokens. Now add batching let’s say (B=2,T=4)(Fig.21)  
![• tokena[0:0](/gpt2/31995D940A7543C989BCEADA54FBDBAE.png)  
Now split it into x and y:(Fig.22)  
![* • buf:- 1].view(8, T) • Israt B'T tokens, shapes into (B, R](Attachments/4F56AE89-01EF-4F50-B653-C80DB2FD8482.png)  
Let’s understand what we did more clearly (Fig.23,Fig.24)  
![30. 612.](/gpt2/06191EFF4BFF4A119800D9EB1FDCE360.png)  
![gives (209. 301](/gpt2/5A984B085F0140099BEE9EB18D5486AC.png)  
```
import numpy as np
class DataLoader:
  def __init__(self,B,T);
    self.B=B
    self.T=T
    files=sorted([x for x in os.listdir('.') if x.endswith('.bin')])
    if len(files)==0:
      raise FileNotFoundError("No .bin files found")
    self.shards=files
    self.shard_idx=0
    self.tokens=self.load_tokens(self.shards[self.shard_idx])
    self.pos=0

  def load_tokens(self,filename):
    npt=np.fromfile(filename,dtype=np.uint16)
    return torch.tensor(npt.astype(np.uint64), dtype=torch.long)

  def next_batch(self):
    B,T=self.B,self.T
    buf=self.tokens[self.pos: self.pos+B*T+1]
    x,y=buf[:-1].view(B,T), buf[1:].view(B,T)
    self.pos+=B*T
    return x,y

```
Now you might think that we are successfully done with transforming our data from shard files into the tensor of shape (B,T) but we have to complete loading from all the shard files.we have assumed that there are enough number of tokens in the tensor (self.tokens) but if not then we have move to the next shard file so let’s do that  
```
import numpy as np
class DataLoader:
  def __init__(self,B,T);
    self.B=B
    self.T=T
    files=sorted([x for x in os.listdir('.') if x.endswith('.bin')])
    if len(files)==0:
      raise FileNotFoundError("No .bin files found")
    self.shards=files
    self.shard_idx=0
    self.tokens=self.load_tokens(self.shards[self.shard_idx])
    self.pos=0

  def load_tokens(self,filename):
    npt=np.fromfile(filename,dtype=np.uint16)
    return torch.tensor(npt.astype(np.uint64), dtype=torch.long)

  def next_batch(self):
    B,T=self.B,self.T
    if self.pos + B*T+1 > len(self.tokens):
      self.shard_idx=(self.shard_idx+1)% len (self_shards)
      self.tokens=self.load_tokens(self.shards[self.shard_idx])
      self.pos=0
    buf=self.tokens[self.pos: self.pos+B*T+1]
    x,y=buf[:-1].view(B,T), buf[1:].view(B,T)
    self.pos+=B*T
    return x,y

```
We have used (%) because if we complete one full epoch, the training again starts from the first epoch.  
So up until now we are done with the following things  
* We can now load the data into the model in batches of size (B,T)  
* We have the forward pass of the model ready to get the output  
But we haven’t written the code to calculate the loss so let’s do that, first to calculate the loss we need also pass the targets (y) to the model so let’s implement that:  
  
4.Implementing loss calculation  
First let’s understand Cross Entropy Loss Step by step visually for a simple example of ( B=2 , T=4 , vocab_size=6):  
we call the output we got from the model after passing the input idx into it as ‘logits’  
So if we pass the input idx of shape (B,T) the output we get is (B,T,vocab_size) (Fig.25):  
  
![Degite share: (2.4.6)](/gpt2/A47DAE2633FE4479BFE2970BBE1DDB1D.png)  
Let’s see what targets look like  
![m120 1:1](/gpt2/1B363C121E45432BAB846D746FAD6A95.png)  
Now the function cross entropy expects a 2D input of the logits and a 1D input of targets , first let’s convert our logits from 3D to 2D we do this in this way ( logits.view(-1,logits.size(-1))) it says that collapse all dimensions except the last one.  
Press enter or click to view image in full size  
![tol3 10.3.0.7.2.1.0.4.0.8.1.2](/gpt2/629571234AB04D97B9C0B2D766FCAB87.png)  
![8 predictico points. each with 6 scores](/gpt2/398B8FB4770144C18323B1E6F144D2A4.png)  
Let’s also convert our targets 2D tensor into a 1D tensor  
![12. 0. 4, 313](/gpt2/1AA8552E98C24B809A5D17AA36CC089D.png)  
![[2.1. 0.3. 0.5. 1.2. 0.0, 0.3 correct token](/gpt2/5D608C5D79544736B2A34491EEF09B2C.png)  
Now for each row cross entropy does three things:  
(i) Convert logits into probabilities:  
![Ace 0: 12.3. 0.3, 0.5, 1.2, 0.0, 0.11](/gpt2/9ABE37AD378B432084864440097691D4.png)  
(ii) Pick the probability of the correct token  
![correct teken for Rse 0 - 3](/gpt2/60AF3B9B039747B8B56DC3E2664E4D1C.png)  
(iii) Take negative log  
![if prob - 0.5 + -20g(0.5) - 0.6g](/gpt2/CDD2976791204A4FA09A5633EC60CD8D.png)  
Now it basically does this for every row so it looks something like :  
![3,50 • very bag](/gpt2/90795CEF9E1E4134BFF62E9B1DC0397B.png)  
Let’s convert this into code now:  
```
import torch
import torch.nn as nn
from torch.nn import Functional as F

class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))

  def forward(self,idx,targets):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    logits=ln_f(x)
    loss=F.cross_entropy(logits.view(-1,logits.size(-1)),targets.view(-1))
    return logits,loss

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

```
```


```
```
class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    att = (q @ k.transpose(-2, -1))         
    att = att / math.sqrt(k.size(-1))        
    att = att.masked_fill(mask == 0, -inf)   
    att = F.softmax(att, dim=-1)             
    out = att @ v  
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x

```
  
Now our model return logits and also loss.  
  
We are still missing on one important thing , if you carefully observe the shape of the logits it is of (B,T,n_embd) but we expect our logits to be of shape (B,T,vocab_size) so where is the mistake? is there some other layer after final layer norm? Yes. Then why isn’t there in the output of GPT-2 layers that we have inspected? that’s because we use the same embedding layer as the input embedding layer ( wte). This is called as weight tying So let’s implement that  
  
```
import torch
import torch.nn as nn
from torch.nn import Functional as F

class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))
    self.lm_head=nn.Linear(config.n_embd,config.vocab_size,bias=False)
    self.transformer.wte.weight=self.lm_head.weight
    

  def forward(self,idx,targets):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    logits=self.lm_head(x)
    loss=F.cross_entropy(logits.view(-1,logits.size(-1)),targets.view(-1))
    return logits,loss

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

```
```


```
```
class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    att = (q @ k.transpose(-2, -1))         
    att = att / math.sqrt(k.size(-1))        
    att = att.masked_fill(mask == 0, -inf)   
    att = F.softmax(att, dim=-1)             
    out = att @ v  
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x

```
Uff 😤, we have done with successfully calculating the loss and logits. Now we need to implement an optimizer to update the weights based on the gradients calculated from the loss.  
So we can start our training process once we implement our optimizer but before that we need to look at some of the things  
As i previously mentioned we need to write a better optimised version of attention calculation so let’s see what it does better:  
5.Better version of attention calculation  
```
att = (q @ k.transpose(-2, -1))        
att = att / math.sqrt(k.size(-1))        
att = att.masked_fill(mask == 0, -inf)   
att = F.softmax(att, dim=-1)             
att = F.dropout(att, p=0.1)             
out = att @ v  

```
We Replace all these lines with a function called as ‘Scaled_dot_product_attention’  
  
```
out = F.scaled_dot_product_attention(q, k, v,is_causal=True)

```
So functionally they are identical. Same math, same result.  
Then why do we use it?  
The reason is something called as ‘Flash Attention’.  
Let’s see what happens in the memory when we do it manually:  
  
![naterializes full (0. nh. T, T) matrix in CPU nemory](/gpt2/534CCEC375F54C769352BC5D05F19F7C.png)  
Let’s see what ‘Scaled_dot_product_attention’ does  
![Does everythinp in small chunks inside fast en-chip SRAN](/gpt2/DBBAA3CCCD34416E8DF7FEC2E0DAA450.png)  
So let’s implement that  
  
```
import torch
import torch.nn as nn
from torch.nn import Functional as F

class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))
    self.lm_head=nn.Linear(config.n_embd,config.vocab_size,bias=False)
    self.transformer.wte.weight=self.lm_head.weight

  def forward(self,idx,targets):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    logits=self.lm_head(x)
    loss=F.cross_entropy(logits.view(-1,logits.size(-1)),targets.view(-1))
    return logits,loss

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

```
```


```
```
class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    y=F.scaled_dot_product_attention(q,k,v,is_causal=True)
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x

```
Now let’s implement the optimizer  
6.Implementing optimizer  
Before actually implementing it, let’s understand what it exactly does.  
Let’s see the training loop once  
* forward pass -> compute loss  
* Backward pass -> compute gradient  
* optimizer -> use gradients to update weights  
So the optimizer job is that given gradients, decide how much to update each weight.  
Let’s just look at some of the optimizers:  
(i) Simple SGD optimizer:  
```
new_weight=old_weight - learning_rate_gradient

```
SGD is simple but it is slow, treats all parameters equally and it is very sensitive to learning rate choice. We use AdamW optimizer in our case, let’s see how that works and it’s advantages:  
(ii) Adam optimizer  
```
Adam update:
Tracks TWO things per parameter:
1. Moving average of gradient          (m — "momentum")
2. Moving average of gradient SQUARED  (v — "velocity/variance")

weight = weight - lr × m / (sqrt(v) + eps)

Benefits:
→ Adapts learning rate PER PARAMETER
→ Parameters with consistent gradients → larger updates
→ Parameters with noisy gradients → smaller updates
→ Much faster convergence than SGD
→ Works well across many different architectures

```
In Adam optimizer we have two variables (beta1 and beta2), these actually control the moving averages. In our case we set these beta values as :  
```
beta1 = 0.9:  Controls momentum (gradient moving average)
              "Remember 90% of past gradient direction"
              "Use 10% of new gradient"

              m_t = 0.9 × m_{t-1} + 0.1 × gradient_t

              At each step:
              90% = carry forward past direction
              10% = incorporate new gradient

beta2 = 0.95: Controls velocity (squared gradient moving average)
              "Remember 95% of past gradient magnitude"

              v_t = 0.95 × v_{t-1} + 0.05 × gradient_t²

              Higher beta2 = smoother estimate of gradient variance

```
We use ‘eps’ so that in any case if the value of v is zero , we have some small value we set it to (1e-8).  
In our case we use AdamW, it’s an optimised version of Adam with weight decay so with weight decay our optimizer looks something like this:  
  
```
Update rule:
weight = weight - learning_rate × gradient - weight_decay × weight
                                             ↑
                                    extra term that SHRINKS weight toward zero

Equivalent to:
weight = weight × (1 - weight_decay) - learning_rate × gradient

Every single update, weight is multiplied by something slightly less than 1
→ Constantly being pulled toward zero
→ Only stays large if gradient consistently pushes it large

```
We do this because of this:  
![Every trainirg step. Two forces act on every welgmi](/gpt2/0AF6DCDCD18C4ACFB2DAC3432DB3F30A.png)  
So the weight does learn. It moves away from zero toward what the data wants. But it can never go as far as it wants because decay keeps pulling it back. So think of it we are here avoiding the overfitting and we are forcing the model to generalise better.  
So to summarise the weight decay:  
![Weight decay Is a FILTER:](/gpt2/B05B28B25A974CE0BFFA933169729262.png)  
So we can implement something like this:  
```
optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

```
But this treats all the parameters identically i.e it applies weight decay to all the parameters but we don’t want to apply weight decay for biases and the layer norm parameters because if we look at the bias update rule ( bias=bias- lr * gradient_of_bias). The gradient of bias tells us that across all the training examples what constant shift reduces the loss on average, because the bias is same for all the inputs.  
To apply weight_decay to only embedding and linear layers we define a new function. Let’s see how that works:  
We can actually pass one of the inputs to the our optimizer function AdamW ,a list that has it’s elements as dictionaries that describes tso let’s do that, to separate the weight_decay parameters from non-weight decay parameters we can use the condition of dimension of the parameter as ≥2 , which embedding and linear weight layers has but biases and layer normalization has only one dimension  
```
def configure_optimizers(self,weight_decay,learning_rate):
  param_dict={pn:p for pn,p in self.named_parameters()}
  decay_params=[ p for n,p in param_dict.items() if p.dim()>=2]
  nondecay_params=[p for n,p in param_dict.items() if p.dim()<2]
  optim_groups=[
  {'params':decay_params , 'weight_decay'= weight_decay},
  {'params':nondecay_params , 'weight_decay'=0.0}
  return torch.optim.AdamW(optim_groups, lr=learning_rate , betas=(0.9,0.95), eps=1e-8)
  

```
Now that we have done with implementing the optimizer you might think that let’s go start our training then, wait they are a couple of things we need to do still  -> we need to first intiliase the weights at the start of the training  
-> we need to make some of the optimizations so that we can make use of most of our compute  
-> we need to define the learning_rate  
So let’s do them one by one:  
7. Intialisation of weights  
First of all how worst the loss can be? think of it , the worst loss is when the model gives the same priority to all the tokens so in that case the loss becomes log(V), this is the worst loss , so we want our model to start from here and then improve so let’s see how we force the weights of the model at the start of the training process so that the loss starts from log(V).  
We want our weights to be small to get equal probability for all the tokens in the vocabulary let’s see why :  
Let’s look at the last step in the forward pass of the model  
  
```
logits = x @ W_embed.T    # (B, T, vocab_size)

```
Where W_embed has shape (vocab_size, n_embd)=(50257,768).  
For one token, logits is a vector of 50257 numbers. Each number is a dot product:  
  
```
logit[i] = x · W_embed[i]
         = x[0]×W[i][0] + x[1]×W[i][1] + ... + x[767]×W[i][767]

```
  
Now what happens when all the weights are exactly zero?  
```
W_embed = all zeros

logit[0] = x[0]×0 + x[1]×0 + ... + x[767]×0 = 0
logit[1] = x[0]×0 + x[1]×0 + ... + x[767]×0 = 0
logit[2] = 0
...
logit[50256] = 0

logits = [0, 0, 0, 0, ..., 0]   ← all identical

```
Now apply softmax:  
  
```
softmax([0, 0, 0, ..., 0]) = ?

softmax(z)[i] = e^z[i] / sum(e^z[j])
             = e^0 / (50257 × e^0)
             = 1 / 50257
             ≈ 0.0000199

Every token gets probability 1/50257
This is PERFECTLY uniform distribution!

```
Now what is the loss?:  
  
```
loss = -log(probability of correct token)
     = -log(1/50257)
     = log(50257)
     ≈ 10.82

This is exactly log(vocab_size)!

```
Now you might think that we intialise all the weights to zero but that’s not true it’s because:  
If all the weights are zero, then all neurons compute the same thing, all the gradients are the same, all weights update by same amount , this is called as symmetry problem so to break the symmetry we need weights to be close to zero but not exactly zero so we intialise our weights with small random normal distribution  
![torch.m.init.normal-(selght. a431+0.0. sta-0.00](/gpt2/2877C90C3CCB4AFBB2353A28A1D27E36.png)  
Why specifically (std=0.02)?  
Let’s see what logits look like with std=0.02:  
  
![Assuning x is also normalized (std • 1 after Layerhorn)](/gpt2/46081B02634847A39AC799209006FB89.png)  
So logits will be rougly equal and this specification comes from the original GPT-2 paper they found that it works better.  
Now you might think that we apply this standard deviation of 0.02 for all the weights but this isn’t true we apply different standard deviation for the projection layers let’s see why  
x_0= embeddings ( Initial Residual stream)  
x_1= x_0 + attn_0(x_0)  
x_2=x_1 + mlp_0(x_1)  
.  
.  
x_24=x_23+mlp_11(x_23)  
So the variance of the resiual stream grows and it finally becomes  
![Screenshot 2026-06-16 at 7.44.46 PM.png](/gpt2/BC2A732B8BF2442D9E42E2635C50BDAB.png)  
We scale down the output projections:  
![2 n leyer * 2 12 * 24 (total eolitior te residust strea](/gpt2/B711E366F6E449169ED7648E51B6A5A5.png)  
Why 1/sqrt(24)?. this basically comes from statistics:  
![Total variance - N× O'](/gpt2/C06EB194ED2340AD9553797A20CCED35.png)  
So we add a term ‘NANOGPT_SCALE_INIT’ to projection layers:  
```
import torch
import torch.nn as nn
from torch.nn import Functional as F

class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))
    self.lm_head=nn.Linear(config.n_embd,config.vocab_size,bias=False)
    self.transformer.wte.weight=self.lm_head.weight

  def forward(self,idx,targets):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    logits=self.lm_head(x)
    loss=F.cross_entropy(logits.view(-1,logits.size(-1)),targets.view(-1))
    return logits,loss

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

```
```


```
```
class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
    self.c_proj.NANOGPT_SCALE_INIT=1.0
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    y=F.scaled_dot_product_attention(q,k,v,is_causal=True)
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    self.c_proj.NANOGPT_SCALE_INIT=1.0
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x

```
Let’s convert this into code now:  
```
import torch
import torch.nn as nn
from torch.nn import Functional as F

class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))
    self.lm_head=nn.Linear(config.n_embd,config.vocab_size,bias=False)
    self.transformer.wte.weight=self.lm_head.weight

  def _init_weights(self,module):
  if isinstance(module,nn.Linear):
    std=0.02
    if hasattr(module, NANOGPT_SCALE_INIT):
      std*=(2*self.config.n_layer)**-0.5
    torch.nn.init.normal_(module.weight,mean=0.0,std=1.0)
    if module.bias is not None: torch.nn.init.zeros_(module.bias)
  elif isinstance(module,nn.Embedding):
    torch.nn.init.normal_(module.weight,mean=0.0,std=0.02)

  def forward(self,idx,targets):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    logits=self.lm_head(x)
    loss=F.cross_entropy(logits.view(-1,logits.size(-1)),targets.view(-1))
    return logits,loss

```
```


```
```
class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
    self.c_proj.NANOGPT_SCALE_INIT=1.0
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    y=F.scaled_dot_product_attention(q,k,v,is_causal=True)
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    self.c_proj.NANOGPT_SCALE_INIT=1.0
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x

```
```


```
Now in pytorch we have a method called self.apply() that walks through EVERY module in the network recursively:  
![Volks through EVERY nodule la the neteck recursively:](/gpt2/4A9F4894EB98427DAC59B4DA7DB0734E.png)  
So let’s apply that:  
```
import torch
import torch.nn as nn
from torch.nn import Functional as F

class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))
    self.lm_head=nn.Linear(config.n_embd,config.vocab_size,bias=False)
    self.transformer.wte.weight=self.lm_head.weight
    self.apply(_init_weights)

  def _init_weights(self,module):
  if isinstance(module,nn.Linear):
    std=0.02
    if hasattr(module, NANOGPT_SCALE_INIT):
      std*=(2*self.config.n_layer)**-0.5
    torch.nn.init.normal_(module.weight,mean=0.0,std=1.0)
    if module.bias is not None: torch.nn.init.zeros_(module.bias)
  elif isinstance(module,nn.Embedding):
    torch.nn.init.normal_(module.weight,mean=0.0,std=0.02)

  def forward(self,idx,targets):
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    logits=self.lm_head(x)
    loss=F.cross_entropy(logits.view(-1,logits.size(-1)),targets.view(-1))
    return logits,loss

```
```


```
```
class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
    self.c_proj.NANOGPT_SCALE_INIT=1.0
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    y=F.scaled_dot_product_attention(q,k,v,is_causal=True)
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    self.c_proj.NANOGPT_SCALE_INIT=1.0
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x

```
8. Optimizations  
The first optimization that we are gonna make is  
(i) Gradient accumulation:  
Let’s say in our setup we are using the batch size as (B=16, T=1024). Now each training step processes only (16*1024=16,384 tokens) to train 10B tokens we need 610,000 optimizer steps.  
Now with B=16 the gradient estimate is based on just 16 sequences. This is extremely noisy,making training unstable and requring a much smaller learning rate to avoid divergence.  
To overcome this we use gradient accumulation which simulates a larger batch size (B=512) while keeping the memory usage the same as (B=16).  
So for B=512, T=1024 that means the total number of tokens that needs to be processed before optimizer step is 524288, we call this number as (total_batch_size), now we pass our original (B=16,T=1024) input 32 times and we accumulate the gradients from the loss at each step then after completion of these 32 steps we do optimizer.step() to update the weights.  
(ii) torch.set_float32_matmul_precision(‘high’)  
Before getting into the actual details of this optimization let us look at some of the properties of GPU.  
Modern NVIDIA GPUs ( A100,H100, RTX 3090) have specialised units called as Tensor cores along with the CUDA cores. Let’s understand what they mean:  
CUDA cores:  
![A CUDA Core le basically a staple arithetic unit](/gpt2/9B4EF334B8FE4FB0BF2BF5C80F24E969.png)  
Now to do matrix multiplication with CUDA cores:  
![Natrix A (4x4) x Matrix R (4‹6T](/gpt2/84A17E9033E54764B86A6B90B38C41A7.png)  
Tensor cores:  
![A Tessor Core Is e completely ditferent physieel undt.](/gpt2/47497A9CF6174345B0C4D758F953E746.png)  
The operation (D= A x B + C) is called as MMA ( matrix multiply accumulate).  
Now let’s see the difference:  
![CUDA Care:](/gpt2/5A8E9ED1C5EB44E0921D5C3E5DC40F91.png)  
Let’s also look at some of the datatypes  
We have various datatypes(FP32, FP16, BF16, INT8,TF32):  
TF32 is a special format NVIDIA invented:  
![1P32 (fe11 f1ost32):](/gpt2/0660C502AA014D0B8D00B89D15FA075F.png)  
In our case we set a parameter ‘set_float32_matmul_precision(‘high’)’ this ensures that we are using TF32.  
Let’s see what happens if we use FP32 instead of TF32:  
Usually Tensor cores are physically wired for specific data types.  
![On A100 (PU. Tensor Cores support](/gpt2/A43B0324A5C846AFAF0ED6990B4D62E2.png)  
FP32 doesn’t fit into Tensor core hardware let’s see why:  
![tach afpvt register an a tensie cire](/gpt2/F8D6679D6DAD42F0854B4993261734F5.png)  
So when you have FP32 tensors and want to do matrix multiply:  
![Datauit batavier (srecision - "highest")](/gpt2/1FDB05376C184B3A896AD23BEE84430B.png)  
But in our case we set ‘set_float32_matmul_precision(‘high’)’.  
We have inputs as FP32 only, we just do the matrix multiplication in TF32:  
![Matrix Multiply:](/gpt2/FD01A7C5B9F94F94AAED65E92F20DCCF.png)  
Now let’s trace through exactly what happens with precision= ‘high’:  
Step 1: you have FP32 input tensors  
![Your weight natrix V(FP22)](/gpt2/5FB34F3D7B1846D8A9A5ED1C70AA53DC.png)  
Step 2: Data is loaded from GPU memory into registers( used to hold data that are currently being processed)  
![when the stely suitely starts](/gpt2/EFF41380386F462EBBF55A034E9EF468.png)  
Step 3: BEFORE feeding into Tensor Core — Truncation  
![arafdriver does this](/gpt2/448AD15BB2AD4C55AD842DCC9547770A.png)  
Step 4: Tensor Core performs the computation  
![These FIT into Tensor Core Input repisterat](/gpt2/BD381FDD8C624F08BBF42EAEF1F01AA2.png)  
Step 5: Accumulation in FP32  
![A matrix aultiply C • A × 8 is really:](/gpt2/FE7577A4ECAF42F5823A9B6BD30DFFAE.png)  
(iii) Vocab_size= 50304  
The actual GPT2 vocab size is 50257. Why 50304? why do we add 47 extra fake tokens?  
This is about GPU memory alignment.  
Let’s understand everything clearly but first let’s see the GPU physical structure:  
![CoU Physical Strusture:](/gpt2/465576B671FF43F0A5150945B3C9513A.png)  
Let’s look at some of the concepts  
> Threads:  
Let’s look at what the thread is  
The THREAD is the task/instructions:  
![Threes (softaare concepti](/gpt2/FD422BF619F24440B76D93A33A024D60.png)  
Threads and cores together make the computation happen:  
![Core reselves: the runders • the instrustion](/gpt2/06D4BCB34249422BB1F41285F8D3D16C.png)  
At any given clock-cycle:  
![Thraad 1](/gpt2/D6E63C8B76B946928F167B37790E0651.png)  
But we usually have WAY more threads than cores for example A100 GPU has 6192 physical CUDA cores and threads we can launch are 2,000,000+ , this is huge.  
Let’s see why launch more threads than cores:  
Press enter or click to view image in full size  
  
![The anteer is LATENCY NEDING:](/gpt2/38371E1CD9414BFF9F2936CA1B39413C.png)  
Let’s once detailly look at what happens in GPU when we write a simple line of code in python ( here cores considered are CUDA ones).  
```
Step 1: YOU WRITE PYTHON CODE
─────────────────────────────
C = A + B
(this is a high level instruction)

Step 2: PYTORCH LAUNCHES A CUDA KERNEL
────────────────────────────────────────
PyTorch says: "I need to add 1024 elements"
Launches 1024 threads
(one thread per element addition)

Step 3: THREADS ARE ORGANIZED INTO WARPS
─────────────────────────────────────────
1024 threads / 32 per warp = 32 warps

Warp 0:  Thread 0-31   (will add elements 0-31)
Warp 1:  Thread 32-63  (will add elements 32-63)
Warp 2:  Thread 64-95  (will add elements 64-95)
...
Warp 31: Thread 992-1023 (will add elements 992-1023)

Step 4: WARPS ARE ASSIGNED TO SMs
───────────────────────────────────
The GPU has 108 SMs.
32 warps get distributed across SMs.
Maybe 1 warp per SM (or multiple).

Step 5: EACH SM ASSIGNS WARP TO CORES
───────────────────────────────────────
Inside SM:
Warp 0's 32 threads get assigned to 32 CUDA cores

Thread 0  → Core 0:  "add A[0] and B[0]"
Thread 1  → Core 1:  "add A[1] and B[1]"
Thread 2  → Core 2:  "add A[2] and B[2]"
...
Thread 31 → Core 31: "add A[31] and B[31]"

Step 6: CORES FETCH DATA FROM HBM
────────────────────────────────────
All 32 cores simultaneously request their data
from HBM memory.

Because indices 0-31 are consecutive in memory:
→ ONE memory transaction fetches all 32 values of A
→ ONE memory transaction fetches all 32 values of B
→ COALESCED! Efficient!

Step 7: DATA ARRIVES IN REGISTERS
───────────────────────────────────
Each core gets its two numbers into registers:

Core 0 register: A[0]=1.5,  B[0]=2.3
Core 1 register: A[1]=0.7,  B[1]=1.1
Core 2 register: A[2]=3.2,  B[2]=0.5
...

```
```


```
```
Step 8: CORES PERFORM COMPUTATION
────────────────────────────────────
All 32 cores simultaneously:
Core 0: 1.5 + 2.3 = 3.8   ← actual silicon doing arithmetic
Core 1: 0.7 + 1.1 = 1.8
Core 2: 3.2 + 0.5 = 3.7
...
(ONE clock cycle for all of them!)

Step 9: RESULTS WRITTEN BACK TO HBM
──────────────────────────────────────
All 32 results written back to consecutive memory
→ ONE memory transaction (coalesced again!)

Step 10: REPEAT FOR NEXT WARP
───────────────────────────────
Warp 1 (threads 32-63) now gets assigned to cores
Same process repeats for elements 32-63
...and so on until all 1024 elements done

```
  
In the above text, there is something mentioned as COALESCED let’s see what that means in detail:  
![A Kare of 32 threats wants to leed 32 nubers fron senory](/gpt2/BA8F0988137943028A4E95C486B94253.png)  
But what if accesses are scattered?  
![Thread taste: biren 10g](/gpt2/686EE9E2DAE14404888F8362D16311C8.png)  
So GPU memory access is fast ONLY when threads access consecutive memory addresses.  
>Tiles:  
Let’s say we want to multiply two big matrices:  
```
Matrix A: [1000 × 768]
Matrix B: [768 × 50304]   ← this is basically the LM head

Result C: [1000 × 50304]

```
This is WAY big too fit in the SM’s shared memory all at once.  
So we process the data from HBM to SM’s shared memory in chunks called as TILES.  
![100/ AS1 A](/gpt2/D41EDC980E9945519187A3CE98C86A2C.png)  
The sizes are power’s of 2: 32,64,128,256…  
Why powers of 2? Because:  
* Warp size = 32 (power of 2)  
* Memory transactions = 32 bytes, 64 bytes, 128 bytes (powers of 2)  
* Everything in hardware is designed around powers of 2  
Now let us tackle the actual problem with 50257:  
As we have discussed previously A matrix s 2D but in memory it is stored as 1D ( just a line of addresses).  
And also as mentioned previously, When a warp loads data from HBM, all 32 threads issue memory request at the same time.  
Let’s see what happens in the last step consider B=8,T=1024 :  
![A: [8102 = 7881](/gpt2/6AB715BF0595443CA0E284A2CA46B054.png)  
How is one element of C is computed?  
![Screenshot 2026-06-16 at 8.08.15 PM.png](/gpt2/8BB4DFF30F5A4C388900F84AFDC3C406.png)  
To compute C, GPU assigns threads:  
![Thread $1 → computes C/0J[31]](Attachments/73EDF05B-FF0D-4D2E-9F7C-D60E601BB152.png)  
The warp is computing C[0][0] through C[0][31].  
![outes C[0113111 needs 0(0)(31), 0[11131). 81211311 xxx 8[7671131](/gpt2/C1E2D045178B42208C88FB8C03BDF9B9.png)  
They need data from B across all 768 rows but only 32 coloumns ( 0 to 31).  
This is done step by step. first load row 0 of B for these 32 coloumns:  
![AlL 32 threade lead fron 8(0)(0) to BfO)(34):](/gpt2/9EA247D621004755B8DE8100C7DE709E.png)  
Then load row 1 of B:  
![Threst 31 + B[31[311 + astress 60268](/gpt2/46DCCDB48C1C4ECB939946ACA74BBE1B.png)  
This continues for all 768 rows. Every single load is coalesced. Everything is FAST.  
The warp structure assigns threads to columns of C :  
Press enter or click to view image in full size  
  
![60257 / 32 • 1570.69...](/gpt2/883CDD8639C44E30AA01D78D39538C25.png)  
Vocab_size is 50257. So valid columns are 0 to 50256 but Warp N+1 assigned columns 50240 to 50271.But columns 50257 to 50271 doesn’t exist in our vocabulary.  
![hresd 0 + column 5000 rea](/gpt2/A84599143025492296D59AB85DE773E3.png)  
15 out of 32 threads are asking for columns that don’t exist.  
Let’s trace what happens when warp N+1 tries to load from B.  
It needs to load data B[0][50240] through B[0][50271]:  
![for sto colane 0 020 0 8075 10 0 01 °](/gpt2/A63A22F203D14E6C98F3161EAB95AC85.png)  
if thread just blindly load, they load wrong data from wrong rows. The result would be completely incorrect. So the CUDA kernel must have a boudary check:  
![Ir Every thread checks bafore Joadirg:](/gpt2/D6E246781F404846901C3861927F0A50.png)  
when Warp N+1 hits this if-else, threads are going in different directions, this is called as warp divergence.  
Since all the threads MUST execute the same instruction at the same time,GPU handles it like this:  
Press enter or click to view image in full size  
![Thread 1:](/gpt2/F225B4A0403A4B1E8D16D6ECE8994A4D.png)  
For every training step (8192*768=6,291,456) warp divergences happens, this is huge and it kills lot of time.  
With 50304:  
![Warp 1571: Thread 9-31 + columns 50272 to 50003](/gpt2/8B0AF882640D43FB90E708A625853C04.png)  
Now let’s look at the fourth and final optimization:  
(iv) torch.compile  
1. How python actually works  
As you know that python is an interpreted language that means when we write python code, our computer cannot run it directly. Computer only understands machine code.  
So python uses an interpreter :  
![YOUR PYTHON COCE!](/gpt2/F6E7DA99F64A4351B7F926591DE4709F.png)  
Every single line, every single operation, python does this.  
2. Python and GPU Don’t work well together  
The GPU is asynchronous  
When Python tells GPU to do something:  
![Pythas says: "May QPU, cespute this natrix aultiply"](/gpt2/192BFE7265E04CE2AD6637B4FEBD7B49.png)  
The GPU runs in the background. Python keeps going. This i called as asynchronous execution.  
But here’s the problem  
![x • torch.nataul(a. b)](/gpt2/7623EDCCDAA04F5794900BCCCA6FF780.png)  
3. Python is blind — it has no global view  
This is the third major problem.  
When python executes line by line, it has no idea of what comes next.  
![y • terch. rele(x)](/gpt2/57BB9E02192A49209981FF1DE9516870.png)  
if you could see all the operations at once, then could optimize them together.  
![-terch.sataul(a, bl](/gpt2/619CA915B09349B092335DFB613810BA.png)  
Now let’s see how torch.compile solves all these problems:  
Stage-1 : when we call torch.compile and do the first forward pass, instead of executing the operations immediately torch.compile watches and records every operation into a graph:  
![torch, cooptle watching your forward pass](/gpt2/7DFF8A7CD59F4736B97F9FDF1126E724.png)  
Now torch.compile can see everything at once.  
Stage-2 : Now that it has full graph, torch.compile applies several optimizations.  
Kernel fusion  
Before fusion:  
![EEFORE PatON (what eager PyTorch does):](/gpt2/2CF1118BAA5749F1BCD1A0530353844D.png)  
After fusion:  
![the full resalt in nanory. I can fuse thee](/gpt2/98C4C639AE9944048BFE144A74B18632.png)  
  
Note that not everything can be fused.  
There are also some more optimizations it does we are not going into those details here.  
Stage 3: Code generation- Trition kernels  
Every GPU operation (matmul, relu , softmax, etc) runs on a CUDA kernel, a program that runs on GPU.  
Pytorch comes with pre-written CUDA kernels for every operation. These kernels are to be written for general purpose , they handle any shape, any size , any data type, so general purpose kernels have overhead because they check for all possible cases.  
torch.compile uses Triton to generate CUSTOM kernels specifically for OUR model’s exact shapes so it doesn’t need to check for all the if/else cases.  
Now we have done with making optimizations, we will add training loop:  
Note that as previously discussed the no of tokens that pass through the model in each step are (524288 = 512*1024) so to complete one full epoch of our training data we need (10,000,000,000 / 524288 = 19073.486)  
So we will train our model for one epoch in this case so max_steps=19073  
```
import torch
import torch.nn as nn
from torch.nn import Functional as F
import numpy as np

total_batch_size=524288
B=16
T=1024
grad_accum_steps= total_batch_size // (B*T)
max_steps=19073


class GPT2Config:
  def __init__(self,block_size=1024,vocab_size=50304, n_layer=12, n_head=12, n_embd=768):
    self.block_size=block_size
    self.vocab_size=vocab_size
    self.n_layer=n_layer
    self.n_head=n_head
    self.n_embd=n_embd

class GPT2(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.transformer=nn.ModuleDict(dict(
    wte=nn.Embedding(config.vocab_size,config.n_embd)
    wpe=nn.Embedding(config.vocab_size,config.n_embd)
    h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]
    ln_f=nn.LayerNorm(config.n_embd)
    ))
    self.lm_head=nn.Linear(config.n_embd,config.vocab_size,bias=False)
    self.transformer.wte.weight=self.lm_head.weight
    self.apply(_init_weights)

  def _init_weights(self,module):
    if isinstance(module,nn.Linear):
      std=0.02
      if hasattr(module, NANOGPT_SCALE_INIT):
        std*=(2*self.config.n_layer)**-0.5
      torch.nn.init.normal_(module.weight,mean=0.0,std=1.0)
      if module.bias is not None: torch.nn.init.zeros_(module.bias)
    elif isinstance(module,nn.Embedding):
      torch.nn.init.normal_(module.weight,mean=0.0,std=0.02)
  
  def configure_optimizers(self,weight_decay,learning_rate):
    param_dict={pn:p for pn,p in self.named_parameters()}
    decay_params=[ p for n,p in param_dict.items() if p.dim()>=2]
    nondecay_params=[p for n,p in param_dict.items() if p.dim()<2]
    optim_groups=[
    {'params':decay_params , 'weight_decay'= weight_decay},
    {'params':nondecay_params , 'weight_decay'=0.0}
    return torch.optim.AdamW(optim_groups, lr=learning_rate , betas=(0.9,0.95), eps=1e-8)

```
```

   def forward(self,idx,targets):

```
```
    x=self.transformer.wte(idx)
    pos=torch.arange(0,T)
    x+=self.transformer.wpe(pos)
    for block in self.transformer.h:
      x=block(x)
    x=ln_f(x)
    logits=self.lm_head(x)
    loss=F.cross_entropy(logits.view(-1,logits.size(-1)),targets.view(-1))
    return logits,loss

class Block(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.ln_1=nn.LayerNorm(config.n_embd)
    self.attn=CausalSelfAttention(config)
    self.ln_2=nn.LayerNorm(config.n_embd)
    self.mlp=MLP(config)

  def forward(self,x):
    x=self.ln_1(x)
    x+=self.attn(x)
    x=self.ln_2(x)
    x+=self.mlp(x)
    return x

class CausalSelfAttention(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_attn=nn.Linear(config.n_embd, 3*config.n_embd)
    self.c_proj=nn.Linear(config.n_embd, config.n_embd)
    self.n_head=config.n_head
    self.c_proj.NANOGPT_SCALE_INIT=1.0
  def forward(self,x):
    B,T,C=x.size()
    x=self.c_attn(x)
    q,k,v=x.split(C,dim=2)
    q=q.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    k=k.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    v=v.view(B,T,self.n_head, C//self.n_head).transpose(1,2)
    y=F.scaled_dot_product_attention(q,k,v,is_causal=True)
    y=out.transpose(1,2).contiguous().view(B,T,C)
    return y                          

```
```


```
```
class MLP(nn.Module):
  def __init__(self,config):
    super().__init__()
    self.c_fc=nn.Linear(config.n_embd, 4*config.n_embd)
    self.gelu=nn.GeLU(approximate='tanh')
    self.c_proj=nn.Linear(4*config.n_embd, config.n_embd)
    self.c_proj.NANOGPT_SCALE_INIT=1.0
    
  def forward(self,x):
    x=self.c_fc(x)
    x=self.gelu(x)
    x=self.c_proj(x)
    return x


class DataLoader:
  def __init__(self,B,T);
    self.B=B
    self.T=T
    files=sorted([x for x in os.listdir('.') if x.endswith('.bin')])
    if len(files)==0:
      raise FileNotFoundError("No .bin files found")
    self.shards=files
    self.shard_idx=0
    self.tokens=self.load_tokens(self.shards[self.shard_idx])
    self.pos=0

  def load_tokens(self,filename):
    npt=np.fromfile(filename,dtype=np.uint16)
    return torch.tensor(npt.astype(np.uint64), dtype=torch.long)

  def next_batch(self):
    B,T=self.B,self.T
    buf=self.tokens[self.pos: self.pos+B*T+1]
    x,y=buf[:-1].view(B,T), buf[1:].view(B,T)
    self.pos+=B*T
    return x,y

torch.set_float32_matmul_precision('high')
model=GPT2(GPT2Config())
loader=DataLoader(B,T)
optimizer=configure_optimizers(weight_decay=0.1,learning_rate=learning_rate)
model=torch.compile(model)

for step in range(max_steps):
  optimizer.zero_grad()
  for micro_step in range(grad_accum_steps):
    x,y=train_loader.next_batch()
    logits,loss=model(x,y)
    loss=loss/grad_accum_steps
    loss.backward()

```
```


```
Now if you observe we did loss= loss/grad_accum_steps that’s because since we are accumulating the gradients for each micro_step and updating the weights per one step we need the average gradient across all the steps to update the weight.  
We have still not defined the learning_rate yet so let’s define what the learning rate should be at each step:  
  
  
  

