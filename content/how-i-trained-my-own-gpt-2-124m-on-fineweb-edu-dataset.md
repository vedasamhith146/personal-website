# How i trained my own GPT-2(124M) on Fineweb-edu dataset

In this article, I document the full process of training a GPT-2 (124M) model from scratch using the FineWeb-Edu dataset. The goal is to preserve transparency, highlight the training setup, and explain the practical lessons from the project.

## Dataset and preprocessing

FineWeb-Edu is an educational web dataset that contains a wide range of curriculum-aligned content. I first cleaned and filtered the dataset, then tokenized it with GPT-2's standard tokenizer to ensure compatibility with the 124M architecture.

## Training setup

I trained the model using the default GPT-2 (124M) architecture, with a context window that matched the tokenizer settings. The training included careful learning-rate scheduling, gradient accumulation, and periodic validation on held-out educational text.

## Results and observations

The model learned meaningful representations of educational concepts, and the final validation metrics showed that it was able to generalize across different academic topics. The training process also revealed the importance of dataset quality and the benefit of proper tokenization.

## Lessons learned

- Use a clean and well-structured dataset for better convergence.
- The GPT-2 tokenizer is an excellent fit for this model size and dataset.
- Validation on held-out educational material is essential for understanding model generalization.

This article is stored as Markdown in the contents directory and rendered using the shared Markdown article layout.
