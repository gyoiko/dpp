import DppApp from "@/components/DppApp";
import { defaultProduct } from "@/data/dppData";

export default function Home() {
  return <DppApp product={defaultProduct} />;
}
