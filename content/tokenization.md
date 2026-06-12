**Tokenization**

**This is the most important step: converting text into numbers. This decision effects how model handles code, math, emojis, and rare words.**

So how do we convert text into numbers?

We know that a computer doesn’t understand text, right? Like, it only understands bits (0, 1). So how did we help the computer understand language?

The first step was ASCII (American Standard Code for Information Interchange). ASCII uses 7 bits to represent a symbol/character/number. So that’s 2^7 = 128 possibilities.

*   (‘A’ -> 65 -> 1000001)
    
*   (‘B’ -> 66 -> 1000010)
    
*   (‘C’ -> 67 -> 1000011)
    

So when we want to encode **HELLO** using ASCII, it becomes:

72 69 76 76 79

which eventually becomes:

01001000 01000101 01001100 01001100 01001111

The initial bit is zero in all cases because ASCII only uses 7 bits to represent a character.

ASCII only has 128 characters. It can represent English well, but how about representing emojis and other languages?

So Unicode was born.

In Unicode, every character gets a unique number:

*   (A -> U+0041)
    
*   (B -> U+0042)
    
*   (中 -> U+4E2D)
    
*   (😀 -> U+1F600)
    

This number is often called a **Unicode code point**.

The Unicode code point is written in hexadecimal format. We then need a way to convert this hexadecimal code point into raw bytes.

We use UTF encodings to convert these Unicode code points into raw bytes. There are various types of UTF encodings, out of which **UTF-8** is the most commonly used.

So there is a Unicode code point for different characters in different languages, and we can then use encodings to convert these code points into raw bytes. Each byte contains 8 bits (0s and 1s), which can finally be understood by the computer.

Now we also have a way to convert text into numbers for neural network based text generation.

However, raw bytes can become quite large. For example:

😁 needs 4 bytes to represent:

\[240, 159, 152, 129\]

So even for small sentences, we will end up with many bytes. To decrease the byte-to-character ratio, we need a way to compress frequently occurring sequences into a more compact representation. That’s a logical thing to do, right?

One such compression algorithm is called **Byte Pair Encoding (BPE)**, introduced in the paper: [https://www.derczynski.com/papers/archive/BPE\_Gage.pdf](https://www.derczynski.com/papers/archive/BPE_Gage.pdf)

Following the idea from this paper, we repeatedly replace the most frequently occurring byte pairs with a new token ID, starting from 256, because a byte value can never be greater than 255.

Since we are building a tokenizer using the BPE algorithm, we call it a **Byte-Level BPE Tokenizer**. I specifically mention _Byte-Level_ because there are many variants of the BPE algorithm, and earlier GPT models used Byte-Level BPE. So, how do we build it? We first have a dataset that is used to train the tokenizer. In our vocabulary, we already have 256 IDs (0–255), corresponding to all possible byte values. We then increase the vocabulary size by replacing the most commonly occurring byte pairs with new IDs starting from 256. This process is repeated until the desired vocabulary size is reached.

First of all, the text in the dataset is converted into raw bytes (UTF-8). For example, the character ‘e’ is replaced with the number 101. So we get a list of integers from the input text. All the integers in this list will be less than or equal to 255 (≤ 255). That’s because a byte can represent a maximum value of 255.

Now, all we need to do is find the most commonly occurring pairs. Let’s say that, out of the given list of integers, the pair (101, 102) occurs most frequently. We then replace all occurrences of the pair (101, 102) with a new ID, and these new IDs start from 256.

So now, we replace all (101, 102) pairs with 256. This ID, 256, represents two letters (“ef”) — \[101 → ‘e’, 102 → ‘f’\].

After replacing all occurrences of (101, 102) with 256, we search for the next most commonly occurring pair and replace that pair with 257. This process continues until we reach the target vocabulary size.

While training the tokenizer, we keep a note of the byte pairs that we are replacing and the new IDs we are assigning to them. So, by the end of the tokenizer training process, we have a dictionary:

{

    (101,102): 256,

    (196,250): 257,

    ...

    (256,257): 9836,

    ...

}

So, we now have a tokenizer. But how do we use this tokenizer to convert text into numbers and numbers back into text?

For that, we use two functions: **Encode** and **Decode**.

The Encode function first converts the input text into raw bytes; let’s call them input bytes. The Encode function then checks whether there is any pair in the input bytes that exists in the dictionary obtained during tokenizer training. If such a pair exists, it replaces that pair with the corresponding ID.

We keep replacing all pairs in the input bytes that are present in the dictionary until there are no more replaceable pairs left.

Let’s say our input bytes are:

\[200,198,65,79,101,102,196,250,68,93\]

There is a pair (101,102), so we replace it with 256. Now we also have a pair (196,250), so we replace that pair with 257.

At this point, the input bytes become:

\[200,198,65,79,256,257,68,93\]

Do we stop here? No.

Look carefully: the pair (256,257) is also present in the dictionary. So we replace that pair with the ID 9836.

The input bytes now become:

\[200,198,65,79,9836,68,93\]

In this way, we keep replacing byte pairs until there is no pair left in the input bytes that exists in the dictionary.

So, this is how we convert text into token IDs. The Encode function converts text into token IDs.

But how can we convert these token IDs back into text?

For that, we use the Decode function, which converts token IDs back into text.

Note that, under the hood, we are actually merging frequently occurring byte pairs, but from a higher-level perspective, we are effectively merging frequently occurring subwords or words.

Let’s understand this better.

In the GPT-2 tokenizer (the tokenizer used by GPT-2, which has a vocabulary size of 50,257), there is a token ID **5347** corresponding to **” ing”**. This means that, under the hood, we were merging the bytes corresponding to the characters **‘i’**, **‘n’**, and **‘g’**. However, when viewed from a larger lens, what we are really doing is merging a frequently occurring subword unit.

So while BPE technically operates on byte pairs, the repeated merging process eventually creates meaningful subword tokens such as **” ing”**, **“tion”**, **“ingly”**, and even entire words that occur frequently in the training data.

BPE tokenizer is all about repeatedly merging the most frequent pairs.

This algorithm is popularized for LLMs by the GPT2 paper - [https://cdn.openai.com/better-language-models/language\_models\_are\_unsupervised\_multitask\_learners.pdf](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)

However, this paper mentions an issue with the BPE algorithm. There are many instances of the same word appearing with different punctuation marks, such as **“dog.”**, **“dog!”**, etc. This wastes vocabulary because the same word appears in multiple variations. To avoid this, the text is first split using a set of rules that essentially separate punctuation, numbers, and characters. BPE is then applied independently to each part, which helps solve this issue.

Even in the case of BPE in general, we usually split the text at whitespace boundaries and apply BPE independently to each word. This is because, if we apply BPE directly to raw text, it may create tokens that cross word boundaries and enter another word, such as **“ing and”**. We do not want this to happen. Additionally, different languages often require language-specific rules for splitting text before applying BPE independently to each segment.

Modern LLMs often use **SentencePiece**, an efficient library for training tokenizers. It supports both **BPE** and **Unigram** tokenization algorithms. We will study the Unigram tokenizer in a later section. First, however, let us understand the problem that SentencePiece is trying to solve, as introduced in the paper - [https://arxiv.org/pdf/1808.06226](https://arxiv.org/pdf/1808.06226)

SentencePiece removes this preprocessing step before applying subword tokenization algorithms and instead applies these algorithms directly to raw text. The original GitHub repository describes SentencePiece as:

“SentencePiece implements subword units (e.g., byte-pair encoding (BPE) and unigram language models) with the extension of direct training from raw sentences. SentencePiece allows us to build a purely end-to-end system that does not depend on language-specific pre/post-processing.”

How did they achieve this? The main idea is surprisingly simple. SentencePiece replaces the space character with a special symbol, ▁, and treats it as a normal character. This allows the tokenizer to preserve word boundary information while operating directly on raw text. As a result, there is no need for language-specific preprocessing tools before training the tokenizer.

The GitHub repository also mentions that SentencePiece supports the Unigram Language Model in addition to BPE. So, let’s understand what a Unigram tokenizer is.

The Unigram model is fundamentally different from BPE. In contrast to BPE, which starts with a small vocabulary and repeatedly merges frequent token pairs, the Unigram model starts with a very large vocabulary. This initial vocabulary is generally a superset containing all characters in the corpus, many substrings up to a certain length, and often some BPE-generated pieces as well. The algorithm then repeatedly removes tokens from this vocabulary until the desired vocabulary size is reached.

Let me try to explain how Unigram tokenization works.

First, we have a text corpus. From this corpus, we construct an initial vocabulary. As mentioned earlier, this vocabulary is typically a superset containing all characters in the corpus, many substrings up to a certain maximum length, and some additional BPE-style pieces. Let us assume that our text corpus contains the following words:

hug

hugs

pug

pun

bun

From this, let us assume that the Unigram model constructs the following initial vocabulary:

h

u

g

p

b

n

s

hu

ug

pu

un

bu

hug

hugs

pug

pun

bun

Now, we calculate an initial probability for each token in the vocabulary, roughly based on frequency heuristics.

After this step, every token in the vocabulary is assigned a probability.

Next, we generate all possible segmentations of each word and score each segmentation using the token probabilities we have obtained.

Let us assume that we have the following token probabilities:

P(ug)=0.107

P(hug)=0.071

P(hugs)=0.036

P(h)=0.071

P(g)=0.107

P(u)=0.178

P(s)=0.036

P(hu)=0.071

We generate all possible segmentations of every word and score them using the token probabilities. Let us consider the word “hug”:

\[hug\] : P(\[hug\])=0.071

\[h\] \[ug\] : P(\[h\]\[ug\])=P(\[h\])P(\[ug\])= 0.071 \* 0.107= 0.0076

\[hu\] \[g\] : P(\[hu\]\[g\])=P(\[hu\])P(\[g\])= 0.071 \* 0.107= 0.0076

\[h\] \[u\] \[g\] : P(\[h\]\[u\]\[g\])= 0.071\*0.178\*0.107  = 0.00135

Total : 0.08755

Now Let's normalize these probabilities:

\[hug\] -> 0.811

\[h\] \[ug\] -> 0.087

\[hu\] \[g\] -> 0.087

\[h\] \[u\] \[g\] -> 0.015

Now these are probabilities of a segmentations of certain words P (S | word)

Now let’s also generate all the possible segmentations of the word “hugs”:

\[hugs\] : P(\[hugs\])=0.036

\[hug\] \[s\] : P(\[hug\]\[s\]) = P(\[hug\])P(\[s\]) =  0.071 \* 0.036  = 0.00256

\[h\] \[ug\] \[s\] : P(\[h\]\[ug\]\[s\]) = P(\[h\])P(\[ug\])P(\[s\]) = 0.071\*0.107\*0.036 = 0.000273

We can also generate more segmentations but for the sake of simplicity let's limit these now and normalize them so we will have probabilities of segementations of word 'hugs'

Similarly, we can do this for the other words in the corpus.

Now, we calculate the expected count of each token in the vocabulary.

To compute these expected counts, we use the following formula. This step is called the E-step (Expectation Step):

**Let us calculate freq(hug).**

To calculate this, we need to look at all possible segmentations of all the words in the corpus and check whether the token **“hug”** appears in a given segmentation. If it does, we take the probability of that segmentation and add it to the total. By summing these probabilities across all segmentations of all words, we obtain the **expected count** (or frequency) of the token.

Let us do this:

Word: hug

\[hug\]           (contains hug)         -> P(\[hug\])         = 0.811

\[h\] \[ug\]        (does not contain hug) -> 0

\[hu\] \[g\]        (does not contain hug) -> 0

\[h\] \[u\] \[g\]     (does not contain hug) -> 0

Word: hugs

\[hugs\]          (does not contain hug) -> 0

\[hug\] \[s\]       (contains hug)         -> P(\[hug\]\[s\])     = 0.065

\[h\] \[ug\] \[s\]    (does not contain hug) -> 0

\[h\] \[u\] \[g\] \[s\] (does not contain hug) -> 0

Therefore,

freq(hug) = 0.811 + 0.065 = 0.876

We perform the same calculation for every token in the initial vocabulary. Once we have the expected counts of all tokens, we update their probabilities using: 

The probabilities obtained from this step become the updated token probabilities. This step is called the **M-step** (Maximization Step).

Notice that we obtained:

freq(hug) = 0.876

This value is called the **expected count** of the token. In reality, the token **“hug”** may appear only once in the corpus, but after averaging over all possible segmentations weighted by their probabilities, its expected count becomes **0.876**.

We then use these newly updated probabilities and repeat the same process again:

E-step -> Compute expected counts

M-step -> Update token probabilities

This process continues until the probabilities **converge**. Convergence means that the token probabilities stop changing significantly between successive iterations. For example:

Iteration 1:

P(hug) = 0.120

Iteration 2:

P(hug) = 0.156

Iteration 3:

P(hug) = 0.161

Iteration 4:

P(hug) = 0.162

Iteration 5:

P(hug) = 0.162

Since the probabilities are no longer changing appreciably, we say that the EM algorithm has **converged**.

The actual process now works as follows.

First, we calculate the likelihood of the corpus.

After EM convergence, we obtain the probabilities of all tokens in the vocabulary. Using these probabilities, we calculate the probability of every possible segmentation of each word and sum them together. We call this value **P(word)**.

The likelihood of the corpus is then calculated as:

Now, we remove a token from the vocabulary and calculate the likelihood of the corpus again. We repeat this process for every token in the vocabulary and compute an importance score for each token:

A smaller score means that removing the token does not significantly affect the corpus likelihood, indicating that the token is less important and can be removed from the vocabulary.

For example, if our initial vocabulary contains 100,000 tokens, we would need to perform this computation for every token, which is extremely expensive in practice.

The exact computation would look something like this:

for piece in current\_vocab:

    ll = current\_loss  # computed using all segmentations of all words

    remove(piece)

    run\_EM\_until\_convergence()

    ll2 = loss\_without\_piece

    delta\[piece\] = ll2 - ll

remove\_piece\_with\_smallest\_delta()

However, rerunning EM for every token is computationally infeasible.

To avoid this, SentencePiece approximates the value of delta(piece) instead of computing it exactly.

The approximation used by SentencePiece is roughly as follows:

for piece in current\_vocab:

    # Find the second-best segmentation of the piece itself

    alternative = second\_best\_segmentation(piece)

    # Run Viterbi on the entire corpus

    # (only the best segmentation of each word is used)

    viterbi\_paths = Viterbi(corpus)

    # Count token frequencies from the Viterbi paths

    freq(token) = count of token in viterbi\_paths

    # Compute current unigram probabilities

    P(token) = freq(token) / sum(freq)

    # Pretend that the piece is removed

    # and replaced by its second-best segmentation

    for each occurrence of piece:

        replace piece with alternative

    # Update frequencies and total token count

    new\_freq(token)

    new\_sum

    # Compute new probabilities after replacement

    P'(token) = new\_freq(token) / new\_sum

    F = freq(piece) / sum(freq)

    delta\[piece\] = F \* (log(P(piece)- Σ log(P'(alternative\_token)))

rank pieces by delta

keep pieces with the largest delta

remove pieces with the smallest delta

Tokens whose removal causes only a small decrease in likelihood are considered unimportant and are removed. Tokens whose removal causes a large decrease in likelihood are considered important and are retained in the vocabulary.

SentencePiece not only optimizes this particular aspect, but its implementation is also written in C++, which makes it extremely fast.

This covers most of what you need to know about modern tokenizers.

There is a paper called **“Byte Pair Encoding is Suboptimal for Language Model Pretraining”**, which argues that the vocabulary learned by the Unigram model is more efficient because it better captures the morphology of language. The paper also reports that models trained using Unigram tokenization often match or outperform those trained using BPE. You can read the paper here: [https://arxiv.org/pdf/2004.03720](https://arxiv.org/pdf/2004.03720)

There is also a paper by Meta AI called **“Byte Latent Transformer: Patches Scale Better Than Tokens”**, which attempts to eliminate the tokenization step altogether and process bytes more directly within the Transformer architecture. You can read that paper here: [https://arxiv.org/pdf/2412.09871](https://arxiv.org/pdf/2412.09871)

However, more research is needed before tokenization can be completely eliminated. For now, all modern LLMs rely on tokenizers. Personally, I am not a big fan of this step, but it is currently necessary.

If you enjoyed this blog, you can follow me on X here: [https://x.com/HiddenNeuron\_14](https://x.com/HiddenNeuron_14)