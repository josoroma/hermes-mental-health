'use server';

import fs from 'fs';
import path from 'path';
import type { Invite } from '@/lib/domain/_schema';

const PATIENTS_DIR = path.join(process.cwd(), 'data/patients');

function inviteDir(patientId: string): string {
  return path.join(PATIENTS_DIR, patientId, 'invites');
}

function inviteFilename(invite: Invite): string {
  const d = new Date(invite.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `${ts}-${invite.token.slice(0, 8)}.json`;
}

export async function saveInviteFile(
  patientId: string,
  invite: Invite
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const dir = inviteDir(patientId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, inviteFilename(invite));
    fs.writeFileSync(filePath, JSON.stringify(invite, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function listInviteFiles(patientId: string): Promise<Invite[]> {
  try {
    const dir = inviteDir(patientId);
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const invites: Invite[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      invites.push(JSON.parse(raw) as Invite);
    }
    return invites.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  try {
    const patientsDir = PATIENTS_DIR;
    if (!fs.existsSync(patientsDir)) return null;
    const patientDirs = fs.readdirSync(patientsDir);
    for (const pid of patientDirs) {
      const invDir = inviteDir(pid);
      if (!fs.existsSync(invDir)) continue;
      const files = fs.readdirSync(invDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(invDir, file), 'utf-8');
        const invite = JSON.parse(raw) as Invite;
        if (invite.token === token) return invite;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateInviteFile(
  patientId: string,
  token: string,
  updates: Partial<Invite>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const dir = inviteDir(patientId);
    if (!fs.existsSync(dir)) return { success: false, error: 'Invites directory not found' };
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const invite = JSON.parse(raw) as Invite;
      if (invite.token === token) {
        const updated = { ...invite, ...updates };
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
        return { success: true };
      }
    }
    return { success: false, error: 'Invite not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteInviteFile(
  patientId: string,
  token: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const dir = inviteDir(patientId);
    if (!fs.existsSync(dir)) return { success: true };
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const invite = JSON.parse(raw) as Invite;
      if (invite.token === token) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
    }
    return { success: false, error: 'Invite not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}