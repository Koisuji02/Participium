//! AUTH CONTROLELR
import { UserRepository } from "@repositories/UserRepository";
import { OfficerRepository } from "@repositories/OfficerRepository";
import { MaintainerRepository } from "@repositories/MaintainerRepository";
import { verifyPassword, generateToken, saveSession } from "@services/authService";
import { UnauthorizedError,  InactiveUserError} from "@utils/utils";
import { OfficerRole } from "@models/enums/OfficerRole";

export async function loginUserByUsername(username: string, password: string): Promise<string> {
  const userRepo = new UserRepository();
  const user = await userRepo.getUserByUsername(username);

  if (!user.password) {
    throw new UnauthorizedError("Invalid username or password");
  }
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid username or password");
  }

  if(!user.isActive) {
    //if not active, the frontend should prompt for OTP verification with code 301 and as body the email
    throw new InactiveUserError("User account is not active", {email: user.email});
  }

  // utenti: isStaff=false, type="user"
  const token = generateToken({
    id: user.id,
    username: user.username,
    isStaff: false,
    type: "user",
    sessionType: "web"
  });

  await saveSession(user.id, token, "web");
  return token;
}
export async function loginUserByMail(email: string, password: string): Promise<string> {
  const userRepo = new UserRepository();
  const user = await userRepo.getUserByEmail(email);

  if (!user.password) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }
  if(!user.isActive) {
    //if not active, the frontend should prompt for OTP verification with code 301 and as body the email
    throw new InactiveUserError("User account is not active", {email: user.email});
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    isStaff: false,
    type: "user",
    sessionType: "web"
  });

  await saveSession(user.id, token, "web");
  return token;
}


export async function loginOfficerByMail(email: string, password: string): Promise<string> {
  const officerRepo = new OfficerRepository();
  const officer = await officerRepo.getOfficerByEmail(email);

  if (!officer.password) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isValid = await verifyPassword(password, officer.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // officer: isStaff=true, type=array di ruoli
  const roles: OfficerRole[] = (officer.roles ?? []).map(r => r.officerRole);
  const token = generateToken({
    id: officer.id,
    username: officer.username,
    isStaff: true,
    type: roles,           // sempre array
    sessionType: "web"
  });

  await saveSession(officer.id, token, "web");
  return token;
}
export async function loginOfficerByUsername(username: string, password: string): Promise<string> {
  const officerRepo = new OfficerRepository();
  const officers = await officerRepo.getOfficersByUsername(username);
  const officer = officers[0];

  if (!officer?.password) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const isValid = await verifyPassword(password, officer.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const roles: OfficerRole[] = (officer.roles ?? []).map(r => r.officerRole);
  const token = generateToken({
    id: officer.id,
    username: officer.username,
    isStaff: true,
    type: roles,           // sempre array
    sessionType: "web"
  });

  await saveSession(officer.id, token, "web");
  return token;
}

export async function loginUser(identifier: string, password: string, isEmail: boolean): Promise<string> {
  return isEmail 
    ? loginUserByMail(identifier, password)
    : loginUserByUsername(identifier, password);
}

export async function loginOfficer(identifier: string, password: string, isEmail: boolean): Promise<string> {
  return isEmail 
    ? loginOfficerByMail(identifier, password)
    : loginOfficerByUsername(identifier, password);
}


export async function getUserByTelegramUsername(telegramUsername: string, chatId: number): Promise<string> {
  const userRepo = new UserRepository();
  const user = await userRepo.getUseryTelegramUsername(telegramUsername);
  if (!user) {
    throw new UnauthorizedError("No user associated with this Telegram username");
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    isStaff: false,
    type: "user",
    sessionType: "telegram",
    chatId: chatId
  });
  await saveSession(user.id, token, "telegram");
  return token;
}


export async function loginMaintainerByMail(email: string, password: string) {
  const maintainerRepo = new MaintainerRepository();
  const maintainer = await maintainerRepo.getMaintainerByEmail(email);

  if (!maintainer.password) {
    throw new UnauthorizedError("Invalid email or password");
  }
  
  const isValid = await verifyPassword(password, maintainer.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // maintainer: isStaff=true, type=array di ruoli
  const token = generateToken({
    id: maintainer.id,
    username: maintainer.name,
    isStaff: true,
    type: [OfficerRole.MAINTAINER],           // sempre array
    sessionType: "web"
  });
  await saveSession(maintainer.id, token, "web");
  return token;
}

export async function loginMaintainerByUsername(username: string, password: string) {
  const maintainerRepo = new MaintainerRepository();
  const maintainers = await maintainerRepo.getMaintainersByUsername(username);
  const maintainer = maintainers[0];

  if (!maintainer || !maintainer.password) {
    throw new UnauthorizedError("Invalid username or password");
  }
  
  const isValid = await verifyPassword(password, maintainer.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid username or password");
  }
  const token = generateToken({
    id: maintainer.id,
    username: maintainer.name,
    isStaff: true,
    type: [OfficerRole.MAINTAINER],           // sempre array
    sessionType: "web"
  });
  await saveSession(maintainer.id, token, "web");
  return token;
}

export async function loginMaintainer(identifier: string, password: string, isEmail: boolean): Promise<string> {
  return isEmail 
    ? loginMaintainerByMail(identifier, password)
    : loginMaintainerByUsername(identifier, password);
}