const { getPool } = require('./db');

// 创建卡号表（如果不存在）
// async function createCardTable() {
//   try {
//     const pool = getPool();
//     const createTableSQL = `
//       CREATE TABLE IF NOT EXISTS cards (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         card_number VARCHAR(50) NOT NULL UNIQUE,
//         description VARCHAR(255),
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         is_deleted TINYINT DEFAULT 0
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
//     `;
//     await pool.execute(createTableSQL);
//     console.log('卡号表创建成功或已存在');
//   } catch (error) {
//     console.error('创建卡号表失败:', error);
//     throw error;
//   }
// }

// 插入卡号记录
async function insertCard(cardData) {
  try {
    const { card_number, description } = cardData;
    
    // 检查卡号是否已存在
    const [existingCards] = await getPool().execute(
      'SELECT id FROM cards WHERE card_number = ? AND is_deleted = 0',
      [card_number]
    );
    
    if (existingCards.length > 0) {
      throw new Error('卡号已存在');
    }
    
    const [result] = await getPool().execute(
      'INSERT INTO cards (card_number, description) VALUES (?, ?)',
      [card_number, description || null]
    );
    
    console.log('卡号插入成功，ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('插入卡号失败:', error);
    throw error;
  }
}

// 更新卡号记录
async function updateCard(id, cardData) {
  try {
    const { card_number, description } = cardData;
    
    // 检查卡号是否已被其他记录使用
    const [existingCards] = await getPool().execute(
      'SELECT id FROM cards WHERE card_number = ? AND id != ? AND is_deleted = 0',
      [card_number, id]
    );
    
    if (existingCards.length > 0) {
      throw new Error('卡号已被其他记录使用');
    }
    
    const [result] = await getPool().execute(
      'UPDATE cards SET card_number = ?, description = ? WHERE id = ? AND is_deleted = 0',
      [card_number, description || null, id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('卡号记录不存在');
    }
    
    console.log('卡号更新成功');
    return true;
  } catch (error) {
    console.error('更新卡号失败:', error);
    throw error;
  }
}

// 删除卡号记录（软删除）
async function deleteCard(id) {
  try {
    const [result] = await getPool().execute(
      'UPDATE cards SET is_deleted = 1 WHERE id = ? AND is_deleted = 0',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return false;
    }
    
    console.log('卡号删除成功');
    return true;
  } catch (error) {
    console.error('删除卡号失败:', error);
    throw error;
  }
}

// 获取所有未删除的卡号记录
async function getAllCards() {
  try {
    const [rows] = await getPool().execute(
      'SELECT id, card_number, description, created_at, updated_at FROM cards WHERE is_deleted = 0 ORDER BY created_at DESC'
    );
    
    return rows.map(row => ({
      id: row.id,
      card_number: row.card_number,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (error) {
    console.error('查询卡号失败:', error);
    throw error;
  }
}

// 根据ID获取卡号记录
async function getCardById(id) {
  try {
    const [rows] = await getPool().execute(
      'SELECT id, card_number, description, created_at, updated_at FROM cards WHERE id = ? AND is_deleted = 0',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      id: row.id,
      card_number: row.card_number,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error('查询卡号失败:', error);
    throw error;
  }
}

// 批量插入卡号记录
async function batchInsertCards(cardsData) {
  try {
    const pool = getPool();
    
    try {
      await pool.beginTransaction();
      
      const results = [];
      for (const cardData of cardsData) {
        const { card_number, description } = cardData;
        
        // 检查卡号是否已存在
        const [existingCards] = await pool.execute(
          'SELECT id FROM cards WHERE card_number = ? AND is_deleted = 0',
          [card_number]
        );
        
        if (existingCards.length > 0) {
          results.push({ card_number, success: false, error: '卡号已存在' });
          continue;
        }
        
        const [result] = await pool.execute(
          'INSERT INTO cards (card_number, description) VALUES (?, ?)',
          [card_number, description || null]
        );
        
        results.push({ 
          card_number, 
          success: true, 
          id: result.insertId 
        });
      }
      
      await pool.commit();
      console.log('批量插入卡号完成');
      return results;
    } catch (error) {
      await pool.rollback();
      throw error;
    } finally {
      // No need to release connection here as getPool manages it
    }
  } catch (error) {
    console.error('批量插入卡号失败:', error);
    throw error;
  }
}

// 初始化时创建表
// createCardTable().catch(console.error);

module.exports = {
  insertCard,
  updateCard,
  deleteCard,
  getAllCards,
  getCardById,
  batchInsertCards
}; 