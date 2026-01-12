import ElementManagerContainer from "@/containers/ElementManagerContainer";
import { Suspense } from "react";

export default function ElementManagerPage({ params }: any) {
  return (
    <Suspense>
      <ElementManagerContainer category={params.category} />
    </Suspense>
  );
}