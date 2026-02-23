//! USER CONTROLLER

import { User } from "@dto/User";
import { UserRepository } from "@repositories/UserRepository";
import { mapUserDAOToDTO } from "@services/mapperService";
import { blacklistUserSessions, getSession } from "@services/authService";

//? get user profile (story 9)
export async function getMyProfile(userId: number, opts?: { includeFollowedReports?: boolean }): Promise<any> {
  // se opts.includeFollowedReports è true, carica anche i report seguiti dall'utente; altrimenti retrocompatibile con le vecchie chiamate
  const userRepo = new UserRepository();
  const user = opts?.includeFollowedReports
    ? await userRepo.getUserByIdWithFollows(userId)
    : await userRepo.getUserById(userId);
  const dto = mapUserDAOToDTO(user, { includeFollowedReports: !!opts?.includeFollowedReports }) as any;

  dto.avatar = user.avatar ?? null;
  dto.telegramUsername = user.telegramUsername ?? null;
  dto.emailNotifications = user.emailNotifications ?? true;
  return dto;
}

//? update user profile (story 9)
export async function updateMyProfile(userId: number, data: { telegramUsername?: string | null; emailNotifications?: boolean; avatarPath?: string | null }): Promise<any> {
  const userRepo = new UserRepository();
  
  // Check if telegram username is being changed
  const currentUser = await userRepo.getUserById(userId);
  const telegramUsernameChanged = data.telegramUsername !== undefined && 
                                   data.telegramUsername !== currentUser.telegramUsername;

  const updated = await userRepo.updateProfile(userId, {
    telegramUsername: data.telegramUsername,
    emailNotifications: data.emailNotifications,
    avatarPath: data.avatarPath,
  });

  // If telegram username changed, invalidate telegram sessions
  if (telegramUsernameChanged) {
    const session = await getSession(userId, "telegram");
    if (session) {
      await blacklistUserSessions(userId, "telegram", "telegram_username_changed");
    }
  }

  const dto = mapUserDAOToDTO(updated) as any;
  
  dto.avatar = updated.avatar;
  dto.telegramUsername = updated.telegramUsername;
  dto.emailNotifications = updated.emailNotifications;
  return dto;
}

export async function getAllUsers(): Promise<User[]> {
  const userRepo = new UserRepository();
  const users = await userRepo.getAllUsers();
  const opts = {includeFollowedReports: false };
  return users.map(user => mapUserDAOToDTO(user, opts)); // pattern che avevamo usato a GeoControl
}


export async function getUser(username: string): Promise<User> {
  const userRepo = new UserRepository();
  const user = await userRepo.getUserByUsername(username);
  return mapUserDAOToDTO(user);
}


export async function createUser(userDto: User): Promise<User> {
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(userDto.email!)) {
    const err: any = new Error("Invalid email format");
    err.statusCode = 400;
    throw err;
  }
  const userRepo = new UserRepository();
  const createdUser = await userRepo.createUser(
    userDto.username!,
    userDto.firstName!,
    userDto.lastName!,
    userDto.email!,
    userDto.password! // will be hashed in repository, not here (quindi qui la passo plain)
  );
  return mapUserDAOToDTO(createdUser);
}

export async function deleteUser(username: string): Promise<void> {
  const userRepo = new UserRepository();
  await userRepo.deleteUser(username);
}

export async function activateAccount(email: string): Promise<void> {
  const userRepo = new UserRepository();
  await userRepo.activateUser(email);
}
export async function isActive(email: string): Promise<boolean> {
  const userRepo = new UserRepository();
  const user =  await userRepo.getUserByEmail(email);
  return user.isActive;
}
export async function logoutUser(): Promise<void> {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token
  //TODO: capire se ci serve ancora o no
  return;
}
