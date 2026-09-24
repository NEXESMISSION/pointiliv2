export { default } from "../../how-it-works/page";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "fr" }];
}
