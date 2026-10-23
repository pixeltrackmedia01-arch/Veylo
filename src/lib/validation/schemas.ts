import { z } from "zod";

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number")
  .transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const money = z.coerce.number({ error: "Enter an amount" }).min(0, "Must be zero or more").max(1_00_00_00_000, "Amount is too large");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const uuid = z.uuid();
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

export const vehicleCategory = z.enum(["car", "two_wheeler"]);
export const purchaseTimeline = z.enum(["immediately", "within_1_month", "within_3_months", "within_6_months", "exploring"]);

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.email("Enter a valid email address").trim().toLowerCase(),
    phone,
    city: z.string().min(1, "Select your city"),
    preferredCategory: vehicleCategory,
    purchaseTimeline,
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(72)
      .regex(/[A-Za-z]/, "Include a letter")
      .regex(/\d/, "Include a number"),
    acceptTerms: z.literal(true, { error: "Please accept the Terms and Privacy Policy" }),
  })
  .strict();
export type SignUpInput = z.input<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

export const emailOnlySchema = z.object({ email: z.email("Enter a valid email address").trim().toLowerCase() });

export const resetPasswordSchema = z
  .object({
    password: signUpSchema.shape.password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    phone,
    cityId: uuid,
    preferredCategory: vehicleCategory.nullable(),
    purchaseTimeline: purchaseTimeline.nullable(),
    notifyEmail: z.boolean(),
    notifyBatchUpdates: z.boolean(),
    notifyMarketing: z.boolean(),
  })
  .strict();
export type ProfileInput = z.input<typeof profileSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email address").trim(),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(3, "Add a subject").max(160),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(4000),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

export const enquirySchema = z.object({
  quotationId: uuid,
  message: z.string().trim().max(1000).optional(),
  sharePhone: z.boolean(),
  consent: z.literal(true, { error: "Please confirm you agree to share your details with this dealership" }),
});

export const intentSchema = z.object({ batchId: uuid, confirm: z.boolean(), note: z.string().trim().max(500).optional() });

export const saleClaimSchema = z.object({
  enquiryId: uuid,
  saleDate: isoDate,
  invoiceNumber: optionalText(80),
  saleReference: optionalText(80),
});

export const bookingSchema = z.object({
  enquiryId: uuid,
  bookingDate: isoDate,
  reference: optionalText(80),
  expectedDelivery: isoDate.optional().or(z.literal("").transform(() => undefined)),
});

// --- Admin -----------------------------------------------------------------

export const manufacturerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug,
  categories: z.array(vehicleCategory).min(1, "Select at least one category"),
  websiteUrl: z.url().optional().or(z.literal("").transform(() => undefined)),
});

export const vehicleSchema = z.object({
  manufacturerId: uuid,
  modelName: z.string().trim().min(1, "Enter the model name").max(120),
  slug,
  category: vehicleCategory,
  bodyType: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2000).optional(),
  highlights: z.string().max(1000).optional(),
  isDemo: z.boolean(),
});
export type VehicleInput = z.input<typeof vehicleSchema>;

export const variantSchema = z.object({
  vehicleId: uuid,
  name: z.string().trim().min(1).max(120),
  slug,
  fuelType: z.enum(["petrol", "diesel", "cng", "electric", "hybrid", "petrol_cng"]).nullable(),
  transmission: z.enum(["manual", "automatic", "amt", "cvt", "dct", "not_applicable"]).nullable(),
  engineCc: z.coerce.number().int().positive().max(10000).nullable().optional(),
  specifications: z.string().max(4000).optional(),
  specsSource: z.string().trim().max(300).optional(),
  specsVerifiedAt: isoDate.optional().or(z.literal("").transform(() => undefined)),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  status: z.enum(["draft", "published", "unpublished", "archived"]),
});
export type VariantInput = z.input<typeof variantSchema>;

export const priceSchema = z
  .object({
    variantId: uuid,
    cityId: uuid,
    exShowroom: money.refine((v) => v > 0, "Ex-showroom price is required"),
    registrationRoadTax: money,
    insurance: money,
    accessories: money,
    extendedWarranty: money,
    otherCharges: money,
    priceKind: z.enum(["indicative", "verified"]),
    source: z.string().trim().min(3, "Cite the source of this price").max(300),
    sourceUrl: z.url().optional().or(z.literal("").transform(() => undefined)),
    verifiedAt: isoDate,
    validUntil: isoDate.optional().or(z.literal("").transform(() => undefined)),
    isDemo: z.boolean(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((v) => !v.validUntil || v.validUntil >= v.verifiedAt, { message: "Must be after the verification date", path: ["validUntil"] });
export type PriceInput = z.input<typeof priceSchema>;

export const batchSchema = z
  .object({
    variantId: uuid,
    cityId: uuid,
    title: z.string().trim().min(5).max(160),
    slug,
    deliveryArea: z.string().trim().min(2).max(200),
    eligibilityRules: z.string().trim().max(2000).optional(),
    targetParticipants: z.coerce.number().int().min(2).max(500),
    minimumParticipants: z.coerce.number().int().min(1).max(500),
    deadline: z.string().min(1, "Set a deadline"),
    isDemo: z.boolean(),
  })
  .refine((v) => v.minimumParticipants <= v.targetParticipants, {
    message: "Minimum can't exceed the target",
    path: ["minimumParticipants"],
  })
  .refine((v) => !Number.isNaN(Date.parse(v.deadline)), { message: "Enter a valid deadline", path: ["deadline"] });
export type BatchInput = z.input<typeof batchSchema>;

export const dealerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug,
  branchAddress: z.string().trim().min(5).max(400),
  cityId: uuid,
  contactPerson: z.string().trim().max(120).optional(),
  businessEmail: z.email().optional().or(z.literal("").transform(() => undefined)),
  businessPhone: z.string().trim().max(20).optional(),
  manufacturerIds: z.array(uuid),
  isActive: z.boolean(),
  isDemo: z.boolean(),
  internalNotes: z.string().max(4000).optional(),
});
export type DealerInput = z.input<typeof dealerSchema>;

export const agreementSchema = z
  .object({
    name: z.string().trim().min(3).max(160),
    dealerId: uuid.optional().or(z.literal("").transform(() => undefined)),
    manufacturerId: uuid.optional().or(z.literal("").transform(() => undefined)),
    vehicleId: uuid.optional().or(z.literal("").transform(() => undefined)),
    variantId: uuid.optional().or(z.literal("").transform(() => undefined)),
    batchId: uuid.optional().or(z.literal("").transform(() => undefined)),
    calcType: z.enum(["fixed", "percentage"]),
    fixedAmount: z.coerce.number().min(0).optional(),
    percentage: z.coerce.number().gt(0).max(100).optional(),
    basisLabel: z.string().trim().max(160).optional(),
    basisDescription: z.string().trim().max(1000).optional(),
    capAmount: z.coerce.number().positive().optional(),
    effectiveFrom: isoDate,
    effectiveTo: isoDate.optional().or(z.literal("").transform(() => undefined)),
    status: z.enum(["draft", "active", "inactive"]),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.calcType === "fixed" && (v.fixedAmount === undefined || Number.isNaN(v.fixedAmount))) {
      ctx.addIssue({ code: "custom", message: "Enter the fixed amount per verified sale", path: ["fixedAmount"] });
    }
    if (v.calcType === "percentage") {
      if (v.percentage === undefined || Number.isNaN(v.percentage)) {
        ctx.addIssue({ code: "custom", message: "Enter the percentage", path: ["percentage"] });
      }
      if (!v.basisLabel) {
        ctx.addIssue({ code: "custom", message: "Define exactly what the percentage applies to", path: ["basisLabel"] });
      }
    }
    if (v.effectiveTo && v.effectiveTo < v.effectiveFrom) {
      ctx.addIssue({ code: "custom", message: "End date must be after the start date", path: ["effectiveTo"] });
    }
  });
export type AgreementInput = z.input<typeof agreementSchema>;

export const lineItemSchema = z.object({
  category: z.enum(["ex_showroom", "registration_road_tax", "insurance", "accessories", "extended_warranty", "other_charge", "discount"]),
  label: z.string().trim().min(1, "Describe this item").max(160),
  amount: money,
  isIncluded: z.boolean(),
  notes: z.string().trim().max(500).optional(),
});

export const quotationSchema = z.object({
  quoteReference: z.string().trim().max(80).optional(),
  validUntil: isoDate,
  conditions: z.string().trim().max(3000).optional(),
  availabilityNote: z.string().trim().max(500).optional(),
  deliveryTimeline: z.string().trim().max(200).optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line item").max(40),
});
export type QuotationInput = z.input<typeof quotationSchema>;

export const contentPageSchema = z.object({
  slug,
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().max(400).optional(),
  body: z.string().trim().min(10).max(50000),
  requiresLegalReview: z.boolean(),
  isPublished: z.boolean(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(3000),
  category: z.string().trim().min(2).max(40),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isPublished: z.boolean(),
});

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

export const LEAD_KINDS = ["on_road_price", "test_drive", "callback", "car_loan", "insurance", "best_price"] as const;

export const leadSchema = z.object({
  kind: z.enum(LEAD_KINDS),
  name: z.string().trim().min(2, "Enter your name").max(120),
  phone,
  city: z.string().trim().max(80).optional(),
  vehicleId: uuid.optional(),
  variantId: uuid.optional(),
  message: z.string().trim().max(1000).optional(),
  consent: z.boolean().refine((v) => v, "Please agree to be contacted about this enquiry"),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});
export type LeadInput = z.input<typeof leadSchema>;
