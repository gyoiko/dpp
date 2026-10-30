export type DppCertification = {
  id: string;
  label: string;
  logo: string;
};

export const DPP_CERTIFICATIONS: DppCertification[] = [
  {
    id: "oeko-tex",
    label: "OEKO-TEX Standard 100",
    logo: "/assets/badges/oeko-tex.png",
  },
  {
    id: "amfori",
    label: "Amfori",
    logo: "/assets/badges/amfori.png",
  },
  {
    id: "better-cotton",
    label: "Better Cotton",
    logo: "/assets/badges/better-cotton.png",
  },
  {
    id: "textile-exchange",
    label: "Textile Exchange Member",
    logo: "/assets/badges/textile-exchange.png",
  },
  {
    id: "peta",
    label: "PETA-Approved Vegan",
    logo: "/assets/badges/peta-approved-vegan.png",
  },
];
