# Can Transformer Language Models Without Explicit Positional Encoding Learn Positional Information?  
  
The other day, when I was learning about the modern positional encoding methods used in transformer language models like RoPE, ALiBi, etc., I noticed that when you ask someone why we need positional encodings, almost everyone has the answer that, “They don’t have positional information, so even if we change the order of the tokens, the models don’t know that we have changed the order,” or maybe similar kinds of arguments. When I was studying transformer language models, I too had a similar intuition and believed this. But a few days back, when I went deep enough and thought about it, I conducted the following experiment. Let’s consider two sentences: “The cat sat on the mat” and “The mat cat on sat the”. Here, the input tokens are shuffled, and I plotted the attention heatmaps in both cases. They were different, and that is obvious in the case of causal-masked transformer language models because we mask out the future tokens so that the current token cannot attend to the future ones.  

So let’s say that in the case where the input is “The cat sat on the mat”, the token “cat” can attend to itself and “The”. But in the next case, the token “cat” can attend to itself and to the tokens “The” and “mat”. The following are the heatmaps in the two different cases. They are different, aren’t they?  

![Attention heatmaps before and after shuffling the input token order](/positional-information/pos_1.png)  
So I thought, “Okay, I found something great!” My argument was simple: “These transformer-based language models are learning incredibly complex patterns from the training data. Can’t they also learn positional information from the causal attention mask itself?” So I argued with GPT for some time, but GPT kept saying that we need explicit positional information.
  
At that time, I was training four different models using different positional encoding methods to see which one extrapolates better. All models were trained on a context length of 128. One used learned positional embeddings, one used sinusoidal positional embeddings, another used RoPE, and the last one used ALiBi. I thought, “Why not also include a model with no positional encoding at all and see what happens?” So I added a NoPos model to the list.  
  
Guess what?  
  
Although we know that learned positional embeddings cannot extrapolate beyond the trained context length, sinusoidal embeddings, RoPE, and ALiBi can. Out of these, I found that ALiBi extrapolated much better than the other models. Obviously, this is expected because improving length extrapolation was one of the main motivations behind ALiBi.  
  
However, one thing I observed was that the model trained with **no positional encoding** extrapolated better than the model trained with **sinusoidal positional encoding**. This was really surprising.  
  
Here is the perplexity versus context length plot for the different models:  
![Sinusoidal](/positional-information/pos_2.png) 

Note that the model using learned positional embeddings cannot extrapolate beyond a context length of 128 because the training context length was only 128. You cannot see that line in the plot because it is overlapped with the RoPE and ALiBi curves.

I thought, “Wow, I have discovered something new!” But guess what? I went on to search the internet to see if anyone else was supporting this idea. I found that there was actually an entire research paper on this topic titled [“Transformer Language Models without Positional Encodings Still Learn Positional Information.”](https://arxiv.org/pdf/2203.16634)

  
So I went on to read the paper.  
  
Interestingly, the paper argued the same point that I had been thinking about. In the abstract, the authors write:  
  
“We conjecture that causal attention enables the model to infer the number of predecessors that each token can attend to, thereby approximating its absolute position.”  
  
They also mention that this phenomenon is robust across different datasets, model sizes, and sequence lengths.  
  
The authors trained models with up to **1.3 billion parameters** on an excerpt of **The Pile** dataset and compared them with models using standard positional encoding mechanisms.  
  
These are the results showing the perplexity of models using different positional encoding methods at a particular context length:  
![Perplexity](/positional-information/pos_3.png)  
They have evaluated across different datasets:  
![Learned](/positional-information/pos_4.png)  
different model sizes:  
![Model Size](/positional-information/pos_5.png)  
 different context lengths:  
![Seq Length](/positional-information/pos_6.png)  
They tested whether NoPos language models learn some form of positional information to compensate for the absence of explicit positional encoding. To do this, they probed each layer of the trained models for positional information. Specifically, they used the token’s hidden representation after each transformer layer, produced by the evaluated language model, and trained a 2-layer feedforward ReLU network to predict the absolute position (0–1023). They trained a separate probe for each layer and measured the mean absolute distance between the probe’s prediction and the token’s actual position. The following is the graph they obtained:  
![Learned](/positional-information/pos_7.png)  
The NoPos model starts with no positional information in the first layer, but it becomes position-aware within four layers and appears to contain more positional information than ALiBi. By the middle layers, NoPos can predict absolute positional information as accurately as models with learned positional embeddings. Finally, all models shed a significant amount of positional information in the final layers.

They also visualized the predictions of the probe and observed that it is most accurate at the beginning of the sequence but becomes fuzzier as it progresses.
![NoPos Probe Predictions](/positional-information/pos_8.png)  
The authors finally state that their results are exciting, but they only explored language models in the 125M to 1.3B parameter range. They observed that as the parameter count increases, the gap between the NoPos method and the other positional encoding methods narrows. This trend leads them to believe that their findings may hold for even larger models. However, they also point out that the largest models today are more than 100 times larger than the models they experimented with, so the scaling trends they observed may not necessarily continue to hold at those scales. They further note that NoPos consistently performs slightly worse than models with learned positional encodings, even though the performance gap is very small.  
  
This made me think a bit about discoveries in the AI space. If we remove positional encodings, the reduction in parameters is very small in the case of learned positional embeddings and essentially nonexistent in the case of RoPE, ALiBi, and sinusoidal encodings. In other words, the overall computational savings from removing positional encodings are minimal, and we cannot really trade that for a loss in model performance. On the other hand, if a discovery trades a small amount of accuracy for substantial computational savings, that could be a much more impactful contribution in this field.  
  
Compute is the moat.  
