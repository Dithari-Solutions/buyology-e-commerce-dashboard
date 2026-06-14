import { useParams } from "react-router";
import NewProduct from "./NewProduct";

/** Edit a product by reusing the full create form in edit mode. */
export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  return <NewProduct editId={id} />;
}
