export { default, generateMetadata } from "../page";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "tn" }];
}
