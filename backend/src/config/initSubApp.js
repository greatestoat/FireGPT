const pool = require('./db');

const initSubAppTables = async () => {
  // Sub-app chats table
  const createSubAppChatsTable = `
    CREATE TABLE IF NOT EXISTS sub_app_chats (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255),
      app_type VARCHAR(50) DEFAULT 'default',
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_app (user_id, app_type),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  // Sub-app messages table
  const createSubAppMessagesTable = `
    CREATE TABLE IF NOT EXISTS sub_app_messages (
      id VARCHAR(36) PRIMARY KEY,
      sub_chat_id VARCHAR(36) NOT NULL,
      role ENUM('user','assistant','system') NOT NULL,
      content TEXT NOT NULL,
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sub_chat_id) REFERENCES sub_app_chats(id) ON DELETE CASCADE,
      INDEX idx_sub_chat (sub_chat_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  try {
    await pool.execute(createSubAppChatsTable);
    await pool.execute(createSubAppMessagesTable);
    console.log('✅ Sub-app tables initialized');
  } catch (err) {
    console.error('❌ Sub-app table creation failed:', err.message);
    throw err;
  }
};

module.exports = initSubAppTables;