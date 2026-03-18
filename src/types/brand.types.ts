export type BrandStatus = "ACTIVE" | "INACTIVE";

export type BrandLanguage = "EN" | "AZ" | "AR";

export interface BrandTranslation {
  language: BrandLanguage;
  name: string;
}

export interface Brand {
  id: string;
  status: BrandStatus;
  translations: BrandTranslation[];
}

export interface CreateBrandRequest {
  nameAz: string;
  nameEn: string;
  nameAr: string;
}
