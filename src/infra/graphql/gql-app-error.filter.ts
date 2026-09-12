import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { LocaleNotFoundError, getText } from '@/infra/localization';
import { AppError } from '@/infra/api/app-error';

const UNKNOWN_SERVER_ERROR = 'UNKNOWN_SERVER_ERROR';

interface GqlRequestContext {
  req: { headers: Record<string, string | undefined> };
}

@Catch()
export class GqlAppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('GraphQL');

  public catch(thrown: unknown, host: ArgumentsHost): GraphQLError {
    const language = this.languageOf(host);

    if (thrown instanceof AppError) {
      if (thrown.shouldBeLogged()) {
        this.logger.warn(`${thrown.code}: ${thrown.devMessage()}`);
      }

      const payload = thrown.payload();
      return new GraphQLError(this.getText(thrown.code, language, payload), {
        extensions: { code: thrown.code, payload },
      });
    }

    this.logger.error(`Unexpected error: ${String(thrown)}`);
    return new GraphQLError(this.getText(UNKNOWN_SERVER_ERROR, language), {
      extensions: { code: UNKNOWN_SERVER_ERROR, payload: {} },
    });
  }

  private languageOf(host: ArgumentsHost): string | undefined {
    const { req } =
      GqlArgumentsHost.create(host).getContext<GqlRequestContext>();
    return req.headers['accept-language'];
  }

  private getText(
    code: string,
    language?: string,
    payload?: Record<string, string | number | boolean>,
  ): string {
    try {
      return getText(code, language, payload);
    } catch (thrown) {
      if (thrown instanceof LocaleNotFoundError) {
        this.logger.warn(`Missing locale "${thrown.localeName}"`);
        return 'Something went wrong';
      }
      throw thrown;
    }
  }
}
