require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');

async function startServer() {
  await connectDB();
  const port = process.env.PORT || 3000;
  return app.listen(port, () => console.log(`ELENOR server running at http://localhost:${port}`));
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start application:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
