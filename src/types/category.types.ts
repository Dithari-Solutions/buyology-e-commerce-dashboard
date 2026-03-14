export type CategoryStatus = "ACTIVE" | "INACTIVE";

export type CategoryLanguage = "AZ" | "EN" | "AR";

export interface CategoryTranslation {
  language: CategoryLanguage;
  name: string;
  description: string;
  slug: string;
}

// Returned by GET /api/category?lang=EN (flat, localized)
export interface Category {
  id: string;
  parentId: string | null;
  status: CategoryStatus;
  name: string;
  description: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// Returned by GET /api/category/:id, POST, PATCH (includes all translations)
export interface CategoryDetail {
  id: string;
  parentId: string | null;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
  translations: CategoryTranslation[];
}

export interface CreateCategoryTranslations {
  nameAz: string;
  descriptionAz: string;
  slugAz: string;
  nameEn: string;
  descriptionEn: string;
  slugEn: string;
  nameAr: string;
  descriptionAr: string;
  slugAr: string;
}

export interface CreateCategoryRequest {
  parentId?: string | null;
  status?: CategoryStatus;
  translations: CreateCategoryTranslations;
}

export interface UpdateCategoryRequest {
  parentId?: string | null;
  status?: CategoryStatus;
  translations?: Partial<CreateCategoryTranslations>;
}
