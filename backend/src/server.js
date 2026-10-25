const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/database');
const { startReminderScheduler, stopReminderScheduler } = require('./services/reminderScheduler');

const startServer = async () => {
  try {
    // Connect to database before listening for requests
    await connectDB();

    // In demo in-memory mode, bootstrap a demonstration administrator account
    if (process.env.USE_IN_MEMORY_DB === 'true') {
      const User = require('./models/User');
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (!existingAdmin) {
        const passwordHash = await User.hashPassword('Admin@123456');
        await User.create({
          name: 'System Admin',
          email: 'admin@taskmanager.local',
          passwordHash,
          role: 'admin',
          isActive: true,
          isEmailVerified: true,
        });
        console.log('ℹ️ [DEMO MODE] Initialized demo admin account: admin@taskmanager.local / Admin@123456');
      }
    }

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Task Manager API Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      console.log(`📡 Client URL allowed: ${env.CLIENT_URL}`);
      // Initialize automatic task reminder scheduler
      startReminderScheduler();
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      stopReminderScheduler();
      server.close(async () => {
        const { disconnectDB } = require('./config/database');
        await disconnectDB();
        console.log('Server and database connections successfully closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start application server:', error.message);
    process.exit(1);
  }
};

startServer();
