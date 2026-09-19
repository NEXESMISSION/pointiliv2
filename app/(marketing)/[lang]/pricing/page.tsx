export { default, generateMetadata } from "../../pricing/page";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "fr" }];
}
