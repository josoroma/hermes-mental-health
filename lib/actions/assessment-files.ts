'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

const CUSTOM_DIR = path.join(process.cwd(), 'data/shared/assessments');

export async function deleteCustomAssessment(
  slug: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const filePath = path.join(CUSTOM_DIR, `${slug}.json`);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `Assessment '${slug}' not found.` };
    }
    fs.unlinkSync(filePath);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}