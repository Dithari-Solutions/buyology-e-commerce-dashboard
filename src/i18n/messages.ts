/**
 * Minimal in-house i18n dictionary for the supplier-facing parts of the dashboard.
 * Add keys as the supplier UI grows. Keys missing in az/ar fall back to en.
 */
export type Lang = "en" | "az" | "ar";

export const SUPPORTED_LANGS: Lang[] = ["en", "az", "ar"];

export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  az: "Azərbaycan",
  ar: "العربية",
};

export const messages: Record<Lang, Record<string, string>> = {
  en: {
    "supplier.nav.myProducts": "My Products",
    "supplier.nav.newProduct": "New Product",
    "supplier.nav.analytics": "Analytics",
    "supplier.nav.account": "My Account",
    "supplier.nav.reviews": "Reviews",

    "supplier.products.title": "My Products",
    "supplier.products.empty": "No products yet.",
    "supplier.products.status.pending": "Pending review",
    "supplier.products.status.approved": "Approved",
    "supplier.products.status.rejected": "Rejected",
    "supplier.products.publish": "Publish",
    "supplier.products.unpublish": "Move to draft",
    "supplier.products.delete": "Delete",

    "supplier.account.title": "My Account",
    "supplier.account.lifecycle": "Account lifecycle",
    "supplier.account.freeze": "Freeze account",
    "supplier.account.unfreeze": "Unfreeze",
    "supplier.account.delete": "Delete account",

    "supplier.newProduct.bgWarning":
      "Product images must be PNG or WebP with the background removed (transparent). Max 5 MB per image, max 8 images.",
    "supplier.newProduct.store": "Store",
    "supplier.newProduct.price": "Store price",
    "supplier.newProduct.submit": "Submit for review",

    "supplier.reviews.title": "Reviews on my products",
    "supplier.reviews.totalReviews": "Total reviews",
    "supplier.reviews.averageRating": "Average rating",
    "supplier.reviews.products": "Products with reviews",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.loading": "Loading…",
    "common.error": "Something went wrong.",
    "common.signOut": "Sign out",
  },

  az: {
    "supplier.nav.myProducts": "Məhsullarım",
    "supplier.nav.newProduct": "Yeni Məhsul",
    "supplier.nav.analytics": "Analitika",
    "supplier.nav.account": "Hesabım",
    "supplier.nav.reviews": "Rəylər",

    "supplier.products.title": "Məhsullarım",
    "supplier.products.empty": "Hələ məhsul yoxdur.",
    "supplier.products.status.pending": "İcmal gözləyir",
    "supplier.products.status.approved": "Təsdiqləndi",
    "supplier.products.status.rejected": "Rədd edildi",
    "supplier.products.publish": "Dərc et",
    "supplier.products.unpublish": "Qaralamaya köçür",
    "supplier.products.delete": "Sil",

    "supplier.account.title": "Hesabım",
    "supplier.account.lifecycle": "Hesab idarəetməsi",
    "supplier.account.freeze": "Hesabı dondur",
    "supplier.account.unfreeze": "Aktivləşdir",
    "supplier.account.delete": "Hesabı sil",

    "supplier.newProduct.bgWarning":
      "Məhsul şəkilləri PNG və ya WebP formatında olmalı, fonu silinmiş (şəffaf) olmalıdır. Maks 5 MB, maks 8 şəkil.",
    "supplier.newProduct.store": "Mağaza",
    "supplier.newProduct.price": "Mağaza qiyməti",
    "supplier.newProduct.submit": "İcmala göndər",

    "supplier.reviews.title": "Məhsullarımıza dair rəylər",
    "supplier.reviews.totalReviews": "Ümumi rəylər",
    "supplier.reviews.averageRating": "Orta reytinq",
    "supplier.reviews.products": "Rəyi olan məhsullar",

    "common.save": "Yadda saxla",
    "common.cancel": "Ləğv et",
    "common.loading": "Yüklənir…",
    "common.error": "Xəta baş verdi.",
    "common.signOut": "Çıxış",
  },

  ar: {
    "supplier.nav.myProducts": "منتجاتي",
    "supplier.nav.newProduct": "منتج جديد",
    "supplier.nav.analytics": "التحليلات",
    "supplier.nav.account": "حسابي",
    "supplier.nav.reviews": "التقييمات",

    "supplier.products.title": "منتجاتي",
    "supplier.products.empty": "لا توجد منتجات بعد.",
    "supplier.products.status.pending": "قيد المراجعة",
    "supplier.products.status.approved": "تمت الموافقة",
    "supplier.products.status.rejected": "مرفوض",
    "supplier.products.publish": "نشر",
    "supplier.products.unpublish": "نقل إلى المسودة",
    "supplier.products.delete": "حذف",

    "supplier.account.title": "حسابي",
    "supplier.account.lifecycle": "إدارة الحساب",
    "supplier.account.freeze": "تجميد الحساب",
    "supplier.account.unfreeze": "إلغاء التجميد",
    "supplier.account.delete": "حذف الحساب",

    "supplier.newProduct.bgWarning":
      "يجب أن تكون صور المنتج بصيغة PNG أو WebP مع إزالة الخلفية (شفافة). الحد الأقصى 5 ميغابايت، 8 صور كحد أقصى.",
    "supplier.newProduct.store": "المتجر",
    "supplier.newProduct.price": "سعر المتجر",
    "supplier.newProduct.submit": "إرسال للمراجعة",

    "supplier.reviews.title": "تقييمات منتجاتي",
    "supplier.reviews.totalReviews": "إجمالي التقييمات",
    "supplier.reviews.averageRating": "متوسط التقييم",
    "supplier.reviews.products": "منتجات بها تقييمات",

    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.loading": "جارٍ التحميل…",
    "common.error": "حدث خطأ ما.",
    "common.signOut": "تسجيل الخروج",
  },
};
