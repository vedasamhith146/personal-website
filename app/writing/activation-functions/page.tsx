'use client';

import { ArticlePage } from '../../../components/ArticlePage';

export default function ActivationFunctionsPage() {
  return (
    <ArticlePage slug="activation-functions">
      <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
        The journey of activation functions
      </h1>

      <div className="prose prose-invert max-w-none space-y-6 text-foreground">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Evolution of activation functions in neural networks.
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
            From Sigmoid to Modern Variants
          </h2>
          <p className="leading-relaxed">
            The history of activation functions in neural networks reflects our evolving understanding of what makes deep networks effective. Starting with sigmoid functions, which had severe gradient problems, we've progressed through ReLU, and now to more sophisticated variants like GELU and SiLU.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
            ReLU and the Vanishing Gradient Problem
          </h2>
          <p className="leading-relaxed">
            ReLU (Rectified Linear Unit) was a breakthrough that largely solved the vanishing gradient problem that plagued sigmoid and tanh activations. Its simplicity—outputting max(0, x)—makes it computationally efficient while still providing the non-linearity necessary for universal function approximation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
            Smooth Activations for Modern Architectures
          </h2>
          <p className="leading-relaxed">
            Recent research has shown that smooth, continuously differentiable activation functions like GELU and SiLU often outperform ReLU in large-scale models. These smoother activations appear to have better properties for both optimization and generalization in the context of large language models and transformers.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            The evolution of activation functions continues to shape the architectures and capabilities of deep learning models.
          </p>
        </div>
      </div>
    </ArticlePage>
  );
}
