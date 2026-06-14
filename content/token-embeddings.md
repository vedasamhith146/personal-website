# What Can We Learn from the Token Embedding Table After Training?  
  
I have trained a GPT-2-like model (124M) using GPT-2’s tokenizer on the FineWeb-Edu dataset on 6B tokens (11,500 steps) and achieved a validation loss of **3.1580** and a HellaSwag accuracy of **28.24**, whereas the original GPT-2 (124M) achieved a HellaSwag accuracy of **29.55**. My model only trained on 6B tokens, whereas, according to sources, the original GPT-2 was trained on 10B tokens.  
  
I always had this thing to know about what these token embeddings are learning. I have the token embedding table after training ended, so now I can inspect this token embedding table. But before inspecting this token embedding table, first I need to know about the tokens in GPT-2 tokenizer’s vocabulary because the token embedding table only has a mapping between an ID and an embedding vector. But before inspecting this, I need to know which ID corresponds to which token. So I started observing GPT-2’s vocabulary, which has 50,257 tokens and their respective token IDs.  
  
One thing that I have observed very often is that many tokens start with a space, such as **” ing”** and **” AND”**. This is because of BPE merges. If you want to know more about tokenization, you can read about it [here](https://www.vedasamhith.tech/writing/tokenization).  
  
**1. First, I want to see whether the model has learned the groups.** I have identified that there are tokens (**wellness, health, nutrition, cancer, disease, medical**) which correspond to the health category, and there are also tokens (**learning, education, children, school, students**) which belong to a particular category. There are tokens (**data, evidence, information, database**) that belong to one category, and there are also tokens (**research, science, study**) which kind of belong to one particular category. There are also tokens (**technology, software, computer, internet**) which belong to a different category.  
  
We know that these belong to different categories, but the model doesn’t have any idea. The model only has a random embedding vector for each of these tokens. After completion of the training process, does the model learn to separate these categories?  
  
To see whether this is happening, I extracted the embedding vectors of each of these tokens by extracting their token IDs from the tokenizer vocabulary, and I used PCA (Principal Component Analysis), which is a technique to compress higher-dimensional vectors to lower-dimensional ones without losing the actual meaning. I originally used embedding vectors of dimension 768 while training. Now, to visualize them, I compressed these vectors to 2D.  
  
And guess what?  
  
The model actually learned this, and it has clearly separated these tokens into their respective categories. This is actually surprising.  
  
![PCA of GPT Token Embeddings](/token-embeddings/token-embedding-pca.png)  
**2. **Next, I reviewed the top 10 nearest neighbours of tokens from different categories, and these are my observations:  
  
First, I reviewed a token from the Health category: **{’ health’}**.  
```
For the token ' health' top-10 nearest neighbours and the their similarity scores:
 1. ' Health'            sim=0.7400
 2. 'health'             sim=0.5980
 3. 'Health'             sim=0.5476
 4. ' healthcare'        sim=0.5318
 5. ' medical'           sim=0.4873
 6. ' wellness'          sim=0.4572
 7. ' healthy'           sim=0.3857
 8. ' wellbeing'         sim=0.3573
 9. ' illness'           sim=0.3406
10. ' nutrition'         sim=0.3330

```
  
I then reviewed a token from the Education category: {' children'}.  
```
For the token ' children' top-10 nearest neighbours their similarity scores:

```
```
 1. ' Children'          sim=0.7333
 2. ' kids'              sim=0.7158
 3. 'Children'           sim=0.6899
 4. 'children'           sim=0.6583
 5. ' child'             sim=0.6426
 6. ' babies'            sim=0.5479
 7. ' infants'           sim=0.5431
 8. ' youngsters'        sim=0.5010
 9. ' Kids'              sim=0.4763
10. ' toddlers'          sim=0.4666

```
  
Next, I examined a token from the Technology category: {' internet'}.  
```
For the token ' internet' top-10 nearest neighbours and their similarity scores: 
 1. ' Internet'          sim=0.7748
 2. 'internet'           sim=0.5900
 3. 'Internet'           sim=0.5824
 4. ' web'               sim=0.5012
 5. ' websites'          sim=0.4947
 6. ' online'            sim=0.4599
 7. ' google'            sim=0.4413
 8. ' wifi'              sim=0.4295
 9. ' broadband'         sim=0.4118
10. ' website'           sim=0.4017

```
  
Moving on to the Research category, I reviewed the token {' science'}.  
```
For the token ' sciene' top-10 nearest neighbours and their similarity scores:

 1. ' Science'           sim=0.7612
 2. ' scientific'        sim=0.6240
 3. 'Science'            sim=0.6091
 4. 'science'            sim=0.6077
 5. ' sciences'          sim=0.5597
 6. ' scientists'        sim=0.5113
 7. ' scientist'         sim=0.5073
 8. ' physics'           sim=0.4891
 9. ' biology'           sim=0.4517
10. ' Sciences'          sim=0.4313

```
  
  I also analyzed a token from the countries category: {’India’}.  
```
For the token ' india' top-10 nearest neighbours and their similarity scores:

 1. 'India'              sim=0.7249
 2. ' China'             sim=0.5441
 3. ' Pakistan'          sim=0.5287
 4. ' Australia'         sim=0.5259
 5. ' Indian'            sim=0.5168
 6. ' Italy'             sim=0.5142
 7. ' Japan'             sim=0.5066
 8. ' Ireland'           sim=0.4882
 9. ' Russia'            sim=0.4833
10. ' Africa'            sim=0.4784

```
  
Finally, I analyzed a token from the numbers category: {' one’}.  
```
For the token ' one' top-10 nearest neighbour and their similarity scores: 
 1. ' One'               sim=0.5782
 2. ' ones'              sim=0.4293
 3. ' two'               sim=0.4066
 4. 'One'                sim=0.3806
 5. ' a'                 sim=0.3703
 6. 'one'                sim=0.3628
 7. ' ONE'               sim=0.3600
 8. ' an'                sim=0.3448
 9. ' three'             sim=0.3057
10. ' another'           sim=0.3046

```
  
Note that I am reviewing particular categories according to the training dataset I used for training my GPT-2 model. As mentioned earlier, I used FineWeb-Edu, which contains mostly educational information, so the tokens that are related to educational content are seen more often during training, and they receive frequent gradient updates so that they can learn these relationships.  
  
If you look at the above tables, you can observe that the top 10 nearest neighbours are closely related to the actual token. However, also note that we have **’ science’**, **‘Science’**, **‘science’**, and **’ sciences’** in our vocabulary. If you think about it, these all almost relate to the same thing, so the vocabulary may not be that efficient.  
  
We use **’ science’** and **‘Science’** in different scenarios:  
  
```
Science is fascinating.
I enjoy science.

```
  
One appears frequently at the start of sentences, while the other appears inside sentences. The model may benefit from having different embeddings for them.  
  
Suppose we remove the tokens **’ scientific’**, **’ scientists’**, and **’ scientist’**, and instead use the token **’ scient’** (which is also available in GPT-2’s tokenizer vocabulary) appended with **‘ific’**, **‘ists’**, and **‘ist’** respectively, thereby decreasing the size of the token embedding table.  
  
However, there is a trade-off. Previously, **’ scientific’** was considered a single token, but now it is broken down into multiple tokens, so the amount of attention computation also increases.  
  
So, perhaps we are trading off the size of the tokenizer vocabulary table against the amount of attention computation.  
  
  
  
  
  
  
  
