const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { readFileSync } = require('fs');
const { join } = require('path');
const { addMocksToSchema } = require('@graphql-tools/mock');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const app = express();
const PORT = process.env.PORT || 4000;

let server;

function loadSchema() {
  try {
    const schemaPath = join(__dirname, 'schema.graphql');
    const typeDefs = readFileSync(schemaPath, 'utf8');
    console.log('📝 Schema loaded from schema.graphql');
    return typeDefs;
  } catch (error) {
    console.error('❌ Error loading schema:', error.message);
    return null;
  }
}

async function createServer() {
  const typeDefs = loadSchema();
  if (!typeDefs) return null;

  const schema = makeExecutableSchema({ typeDefs });
  const mockedSchema = addMocksToSchema({
    schema,
    mocks: {
      Int: () => Math.floor(Math.random() * 100),
      String: () => 'Mock String',
      ID: () => Math.random().toString(36).substr(2, 9),
    },
  });

  const apolloServer = new ApolloServer({
    schema: mockedSchema,
    introspection: true,
    csrfPrevention: false,
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });
  
  console.log('🚀 Apollo Server configured with auto-mocking');
  return apolloServer;
}


async function startServer() {
  server = await createServer();
  
  if (!server) {
    console.error('❌ Failed to start server');
    process.exit(1);
  }

  const httpServer = app.listen(PORT, () => {
    console.log(`🎯 Server running at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`📊 GraphQL Playground available at http://localhost:${PORT}${server.graphqlPath}`);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    if (server) await server.stop();
    httpServer.close();
  });
}

app.get('/', (req, res) => {
  res.json({
    message: 'GraphQL Mock Server',
    graphql: `http://localhost:${PORT}/graphql`,
    playground: `http://localhost:${PORT}/graphql`
  });
});

startServer().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});