
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const conversationId = '82e35c21-9c08-44c5-9020-f9b487964583';

    console.log(`Deleting conversation ${conversationId}...`);

    // Delete messages first
    const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

    if (msgError) console.error('Error deleting messages:', msgError);
    else console.log('Messages deleted.');

    // Delete participants
    const { error: partError } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId);

    if (partError) console.error('Error deleting participants:', partError);
    else console.log('Participants deleted.');

    // Delete conversation
    const { error: convoError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

    if (convoError) console.error('Error deleting conversation:', convoError);
    else console.log('Conversation deleted.');
}

main();
