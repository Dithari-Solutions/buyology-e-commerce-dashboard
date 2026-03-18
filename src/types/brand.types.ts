export type BrandStatus = "ACTIVE" | "INACTIVE";

export interface Brand {
  id: string;
  nameAz: string;
  nameEn: string;
  nameAr: string;
  status: BrandStatus;
}

export interface CreateBrandRequest {
  nameAz: string;
  nameEn: string;
  nameAr: string;
}
