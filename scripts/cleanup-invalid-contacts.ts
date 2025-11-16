// Script to cleanup invalid contacts (status@broadcast and group chats)
import { db } from '@/lib/db';
import { contacts, chatMessages } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function cleanupInvalidContacts() {
  console.log('🧹 Starting cleanup of invalid contacts...');
  
  try {
    // Delete messages from invalid contacts
    const deletedMessages = await db.delete(chatMessages)
      .where(
        sql`${chatMessages.phoneNumber} LIKE '%broadcast%' OR ${chatMessages.phoneNumber} LIKE '%@g.us'`
      );
    
    console.log('✅ Deleted invalid messages');
    
    // Delete invalid contacts
    const deletedContacts = await db.delete(contacts)
      .where(
        sql`${contacts.phoneNumber} LIKE '%broadcast%' OR ${contacts.phoneNumber} LIKE '%@g.us'`
      );
    
    console.log('✅ Deleted invalid contacts');
    console.log('🎉 Cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupInvalidContacts();
