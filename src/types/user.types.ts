export type UserType = "CUSTOMER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface UserListItem {
  userId: string;
  authCredentialId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  userType: UserType;
  status: UserStatus;
  joinedAt: string;
}

export interface UsersListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  users: UserListItem[];
}

export interface FavoriteItem {
  id: string;
  productId: string;
  productSku: string;
  savedAt: string;
}

export interface UserFavorites {
  authCredentialId: string;
  total: number;
  items: FavoriteItem[];
}

export interface SelectedSpec {
  specOptionId: string;
  groupCode: string;
  value: string;
  unit: string | null;
  additionalPrice: number;
  colorCode: string | null;
}

export interface CartItem {
  id: string;
  productId: string;
  productSku: string;
  variantId: string;
  variantSku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedSpecs: SelectedSpec[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveCart {
  id: string;
  authCredentialId: string;
  status: string;
  totalPrice: number;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail {
  userId: string;
  authCredentialId: string;
  email: string | null;
  userType: UserType;
  status: UserStatus;
  joinedAt: string;
  registrationIp: string | null;
  registrationDevice: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  favorites: UserFavorites;
  activeCart: ActiveCart | null;
}
