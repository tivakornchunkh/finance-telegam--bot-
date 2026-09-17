import { InlineKeyboard } from 'grammy';

export function createConfirmationKeyboard(draftId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ ยืนยัน', `confirm_${draftId}`)
    .text('✏️ แก้ไข', `edit_${draftId}`)
    .text('❌ ยกเลิก', `cancel_${draftId}`);
}

export function createDuplicateWarningKeyboard(draftId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('⚠️ ยืนยันบันทึกซ้ำ', `force_confirm_${draftId}`)
    .text('❌ ยกเลิก', `cancel_${draftId}`);
}

export function createDeleteConfirmationKeyboard(transactionId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('🗑️ ยืนยันลบรายการ', `delete_confirm_${transactionId}`)
    .text('❌ ยกเลิก', 'delete_cancel');
}

