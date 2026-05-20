import type { LLMProviderName } from '../value-objects/LLMProvider';
import type { SummaryKind } from '../value-objects/SummaryKind';
import type { TokenCount } from '../../tokens/value-objects/TokenCount';

export interface SummaryProps {
  readonly kind: SummaryKind;
  readonly content: string;
  readonly tokensIn: TokenCount;
  readonly tokensOut: TokenCount;
  readonly provider: LLMProviderName;
  readonly generatedAt: Date;
}

export class Summary {
  constructor(private readonly props: SummaryProps) {}

  get kind(): SummaryKind {
    return this.props.kind;
  }

  get content(): string {
    return this.props.content;
  }

  get tokensIn(): TokenCount {
    return this.props.tokensIn;
  }

  get tokensOut(): TokenCount {
    return this.props.tokensOut;
  }

  get provider(): LLMProviderName {
    return this.props.provider;
  }

  get generatedAt(): Date {
    return this.props.generatedAt;
  }
}
