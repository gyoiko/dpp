export type DppCertification = {
  id: string;
  label: string;
  logo: string;
};

export const DPP_CERTIFICATIONS: DppCertification[] = [
  {
    id: "gots",
    label: "Global Organic Textile Standard",
    logo: "/assets/certifications/gots.png",
  },
  {
    id: "grs",
    label: "Global Recycled Standard",
    logo: "/assets/certifications/grs.png",
  },
  {
    id: "rcs",
    label: "Recycled Claim Standard",
    logo: "/assets/certifications/rcs.png",
  },
  {
    id: "ocs",
    label: "Organic Content Standard",
    logo: "/assets/certifications/ocs.png",
  },
  {
    id: "bci",
    label: "Better Cotton Initiative",
    logo: "/assets/certifications/bci.png",
  },
  {
    id: "us-cotton-protocol",
    label: "US Cotton Protocol",
    logo: "/assets/certifications/us-cotton-protocol.png",
  },
  {
    id: "regenagri",
    label: "Regenagri",
    logo: "/assets/certifications/regenagri.png",
  },
  {
    id: "fsc",
    label: "Forest Stewardship Council",
    logo: "/assets/certifications/fsc.png",
  },
  {
    id: "standar-100",
    label: "OEKO-TEX Standard 100",
    logo: "/assets/certifications/standar-100.png",
  },
  {
    id: "step",
    label: "OEKO-TEX STeP",
    logo: "/assets/certifications/step.png",
  },
  {
    id: "mff",
    label: "Masters of Flax Fibre",
    logo: "/assets/certifications/mff.png",
  },
  {
    id: "halal",
    label: "Halal",
    logo: "/assets/certifications/halal.png",
  },
];

export const DPP_CERTIFICATION_IDS = DPP_CERTIFICATIONS.map((certification) => certification.id);

export function isCertificationId(value: string): boolean {
  return DPP_CERTIFICATION_IDS.includes(value);
}

export function parseVisibleCertifications(value: string | null | undefined): string[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const ids = parsed.filter(
      (item): item is string => typeof item === "string" && isCertificationId(item),
    );

    return [...new Set(ids)];
  } catch {
    return null;
  }
}

export function serialiseVisibleCertifications(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw new Error("visibleCertifications must be an array of certification ids.");
  }

  const ids: string[] = [];

  for (const raw of value) {
    if (typeof raw !== "string") {
      throw new Error("visibleCertifications must be an array of certification ids.");
    }

    if (!isCertificationId(raw)) {
      throw new Error(`Unknown certification id: ${raw}`);
    }

    if (!ids.includes(raw)) {
      ids.push(raw);
    }
  }

  return JSON.stringify(ids);
}

export function certificationsFor(value: string | null | undefined): DppCertification[] {
  const ids = parseVisibleCertifications(value);

  if (!ids) {
    return DPP_CERTIFICATIONS;
  }

  const selected = new Set(ids);

  return DPP_CERTIFICATIONS.filter((certification) => selected.has(certification.id));
}
