export { default, generateMetadata } from "../../how-it-works/page";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "fr" }];
}
