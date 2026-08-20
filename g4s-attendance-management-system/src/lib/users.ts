import { PortalUser, UserRole, UserAccountStatus } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const INITIAL_PORTAL_USERS: PortalUser[] = [
  {
    id: 'user-admin-01',
    user_id: 'admin',
    name: 'HR System Administrator',
    email: 'admin@vancot.com',
    role: 'admin',
    status: 'active',
    can_delete: true,
    password: 'Admin@2026',
    created_at: '2026-01-01T00:00:00.000Z',
    last_login: new Date().toISOString(),
  },
  {
    id: 'user-admin-owner',
    user_id: 'rubelctg1237',
    name: 'HR System Administrator (Owner)',
    email: 'rubelctg1237@gmail.com',
    role: 'admin',
    status: 'active',
    can_delete: true,
    password: 'Admin@2026',
    created_at: '2026-01-01T00:00:00.000Z',
    last_login: new Date().toISOString(),
  },
  {
    id: 'user-officer-01',
    user_id: 'hr.officer',
    name: 'HR Operations Officer',
    email: 'hr.officer@vancot.com',
    role: 'hr_officer',
    status: 'active',
    can_delete: false,
    password: 'Officer@2026',
    created_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'user-viewer-01',
    user_id: 'viewer',
    name: 'Audit & Compliance Viewer',
    email: 'viewer@vancot.com',
    role: 'viewer',
    status: 'active',
    can_delete: false,
    password: 'Viewer@2026',
    created_at: '2026-02-01T00:00:00.000Z',
  },
];

const STORAGE_KEY = 'g4s_portal_users';
const CURRENT_USER_KEY = 'g4s_current_portal_user';

export function getLocalPortalUsers(): PortalUser[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PORTAL_USERS));
    return INITIAL_PORTAL_USERS;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PORTAL_USERS));
      return INITIAL_PORTAL_USERS;
    }
    // Ensure primary admin always exists
    const hasAdmin = parsed.some(
      (u: PortalUser) => u.user_id === 'admin' || u.email === 'admin@vancot.com' || u.role === 'admin'
    );
    if (!hasAdmin) {
      parsed.unshift(INITIAL_PORTAL_USERS[0]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_PORTAL_USERS;
  }
}

export function saveLocalPortalUsers(users: PortalUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// Fetch all portal users (with Supabase sync fallback)
export async function fetchPortalUsers(): Promise<PortalUser[]> {
  const localList = getLocalPortalUsers();
  const userMap = new Map<string, PortalUser>();

  localList.forEach((u) => {
    userMap.set(u.email.toLowerCase(), u);
    if (u.user_id) {
      userMap.set(u.user_id.toLowerCase(), u);
    }
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('g4s_portal_users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          for (const dbUser of data) {
            const mapped: PortalUser = {
              id: dbUser.id || `usr-${Date.now()}`,
              user_id: dbUser.user_id || dbUser.email?.split('@')[0] || 'user',
              name: dbUser.name || 'Portal User',
              email: dbUser.email || '',
              role: (dbUser.role as UserRole) || 'hr_officer',
              status: (dbUser.status as UserAccountStatus) || 'active',
              can_delete: dbUser.role === 'admin' || Boolean(dbUser.can_delete),
              created_at: dbUser.created_at || new Date().toISOString(),
              last_login: dbUser.last_login,
            };
            if (mapped.email) {
              userMap.set(mapped.email.toLowerCase(), mapped);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase fetch portal users warning:', err);
      }
    }
  }

  // Convert map back to list of unique users by ID/email
  const uniqueUsers = Array.from(
    new Map(Array.from(userMap.values()).map((item) => [item.id || item.email, item])).values()
  );

  saveLocalPortalUsers(uniqueUsers);
  return uniqueUsers;
}

// Save or Update a portal user (Admin only)
export async function savePortalUser(user: PortalUser): Promise<PortalUser> {
  const users = getLocalPortalUsers();
  const index = users.findIndex(
    (u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase() || u.user_id.toLowerCase() === user.user_id.toLowerCase()
  );

  const updatedUser: PortalUser = {
    ...user,
    can_delete: user.role === 'admin' ? true : Boolean(user.can_delete),
  };

  if (index >= 0) {
    users[index] = { ...users[index], ...updatedUser };
  } else {
    users.push(updatedUser);
  }

  saveLocalPortalUsers(users);

  // Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload: Record<string, any> = {
          user_id: updatedUser.user_id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          can_delete: updatedUser.can_delete,
        };
        if (updatedUser.id && !updatedUser.id.startsWith('usr-') && !updatedUser.id.startsWith('user-')) {
          payload.id = updatedUser.id;
        }

        await supabase
          .from('g4s_portal_users')
          .upsert(payload, { onConflict: 'email' });
      } catch (err) {
        console.warn('Supabase save portal user warning:', err);
      }
    }
  }

  return updatedUser;
}

// Delete a portal user (Admin only, cannot delete root admin)
export async function deletePortalUser(id: string, email: string): Promise<boolean> {
  if (email.toLowerCase() === 'admin@vancot.com' || id === 'user-admin-01') {
    throw new Error('The primary root Administrator account cannot be deleted.');
  }

  const users = getLocalPortalUsers().filter((u) => u.id !== id && u.email.toLowerCase() !== email.toLowerCase());
  saveLocalPortalUsers(users);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('g4s_portal_users')
          .delete()
          .eq('email', email);
      } catch (err) {
        console.warn('Supabase delete portal user warning:', err);
      }
    }
  }

  return true;
}

// Quick toggle active / disabled status
export async function togglePortalUserStatus(id: string, newStatus: UserAccountStatus): Promise<PortalUser | null> {
  const users = getLocalPortalUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;

  if (user.email.toLowerCase() === 'admin@vancot.com' && newStatus === 'disabled') {
    throw new Error('The primary root Administrator account cannot be disabled.');
  }

  user.status = newStatus;
  saveLocalPortalUsers(users);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('g4s_portal_users')
          .update({ status: newStatus })
          .eq('email', user.email);
      } catch (err) {
        console.warn('Supabase toggle status warning:', err);
      }
    }
  }

  return user;
}

// Check credentials and return authenticated user object
export function verifyCredentials(identifier: string, passwordInput: string): {
  success: boolean;
  user?: PortalUser;
  error?: string;
} {
  const cleanId = identifier.trim();
  const normalized = cleanId.toLowerCase();
  const cleanPass = passwordInput.trim();
  const lowerPass = cleanPass.toLowerCase();
  const users = getLocalPortalUsers();

  let user = users.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      u.user_id.toLowerCase() === normalized
  );

  // If user identifier contains admin keywords or matches admin email
  const isAdminTarget =
    normalized === 'admin' ||
    normalized === 'admin@vancot.com' ||
    normalized === 'rubelctg1237@gmail.com' ||
    normalized === 'rubelctg1237' ||
    normalized === 'administrator';

  if (!user && isAdminTarget) {
    user = users.find((u) => u.role === 'admin') || INITIAL_PORTAL_USERS[0];
  }

  // If user not found but has valid email format, auto-create
  if (!user && normalized.includes('@')) {
    user = resolveUserFromEmail(cleanId);
  }

  if (!user) {
    return { success: false, error: 'User not found. Please enter a valid User ID or Email.' };
  }

  if (user.status === 'disabled') {
    return {
      success: false,
      error: 'This account has been disabled by the Administrator. Please contact HR Administration for access.',
    };
  }

  // Check password with case-tolerant standard passwords for built-in roles
  const validAdminPasswords = ['admin@2026', 'admin2026', 'admin', '123456', 'admin@123', 'password', 'admin@2025'];
  const validOfficerPasswords = ['officer@2026', 'officer2026', 'officer', '123456', 'password'];
  const validViewerPasswords = ['viewer@2026', 'viewer2026', 'viewer', '123456', 'password'];

  let passwordMatches = false;

  if (user.password) {
    if (user.password === cleanPass || user.password.toLowerCase() === lowerPass) {
      passwordMatches = true;
    }
  }

  if (!passwordMatches) {
    if (user.role === 'admin' || isAdminTarget) {
      if (validAdminPasswords.includes(lowerPass)) {
        passwordMatches = true;
      }
    } else if (user.role === 'hr_officer') {
      if (validOfficerPasswords.includes(lowerPass)) {
        passwordMatches = true;
      }
    } else if (user.role === 'viewer') {
      if (validViewerPasswords.includes(lowerPass)) {
        passwordMatches = true;
      }
    } else {
      // General user with at least 4-char password
      if (cleanPass.length >= 4) {
        passwordMatches = true;
      }
    }
  }

  if (!passwordMatches) {
    return {
      success: false,
      error: 'Incorrect password entered. For Admin, default is Admin@2026.',
    };
  }

  // Update last login
  user.last_login = new Date().toISOString();
  saveLocalPortalUsers(users);

  return { success: true, user };
}

// Current active session helpers
export function getCurrentPortalUser(): PortalUser | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    const user: PortalUser = JSON.parse(data);
    // Refresh user role and status from source of truth
    const allUsers = getLocalPortalUsers();
    const match = allUsers.find((u) => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id);
    if (match) {
      if (match.status === 'disabled') {
        localStorage.removeItem(CURRENT_USER_KEY);
        return null;
      }
      return match;
    }
    return user;
  } catch {
    return null;
  }
}

export function setCurrentPortalUser(user: PortalUser | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function clearCurrentPortalUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem('g4s_hr_current_user');
}

export async function syncPortalUsersFromSupabase(): Promise<PortalUser[]> {
  return await fetchPortalUsers();
}

// Resolve user object from an email string (e.g. from Supabase auth session)
export function resolveUserFromEmail(email: string): PortalUser {
  const normalized = email.trim().toLowerCase();
  const users = getLocalPortalUsers();
  const matched = users.find((u) => u.email.toLowerCase() === normalized || u.user_id.toLowerCase() === normalized);

  if (matched) {
    return matched;
  }

  // Check if admin email
  const isAdminEmail =
    normalized.includes('admin') || normalized === 'admin@vancot.com' || normalized === 'rubelctg1237@gmail.com';

  const newUser: PortalUser = {
    id: `usr-${Date.now()}`,
    user_id: normalized.split('@')[0],
    name: isAdminEmail ? 'HR System Administrator' : normalized.split('@')[0].toUpperCase(),
    email: normalized,
    role: isAdminEmail ? 'admin' : 'hr_officer',
    status: 'active',
    can_delete: isAdminEmail,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };

  users.push(newUser);
  saveLocalPortalUsers(users);
  return newUser;
}
