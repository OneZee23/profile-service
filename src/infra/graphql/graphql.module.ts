import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import responseCachePlugin from '@apollo/server-plugin-response-cache';
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { json } from 'express';
import { isProduction } from '@/utils/env';
import { getConfig, provideConfig } from '@/utils/config';
import { depthLimit } from './depth-limit.rule';
import { GraphqlConfig } from './graphql.config';

const RESPONSE_CACHE_MAX_BYTES = 4 * 1024 * 1024;

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: async (): Promise<ApolloDriverConfig> => {
        const config = await getConfig(GraphqlConfig);

        return {
          path: config.path,
          autoSchemaFile: isProduction() ? true : 'src/schema.gql',
          buildSchemaOptions: { addNewlineAtEnd: true },
          sortSchema: true,
          playground: false,
          introspection: config.introspection,
          csrfPrevention: true,
          cache: new InMemoryLRUCache({ maxSize: RESPONSE_CACHE_MAX_BYTES }),
          validationRules: [depthLimit(config.maxDepth)],
          plugins: [
            ...(config.sandbox
              ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
              : []),
            ApolloServerPluginCacheControl({
              defaultMaxAge: config.responseCacheTtlSeconds,
            }),
            responseCachePlugin(),
          ],
          context: ({ req }: { req: unknown }) => ({ req }),
        };
      },
    }),
  ],
  providers: [provideConfig(GraphqlConfig)],
})
export class GraphqlModule implements NestModule {
  constructor(private readonly config: GraphqlConfig) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(json({ limit: this.config.maxBodyBytes }))
      .forRoutes(this.config.path);
  }
}
