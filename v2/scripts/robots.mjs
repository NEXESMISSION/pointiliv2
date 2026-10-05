/**
 * Every account a script makes is a robot.
 *
 * Its number goes on the `robots` list BEFORE the account exists, so the
 * founder's console never shows it among the real shops and accounts — not
 * even while the run is going (see `is_robot` in supabase/schema.sql). When
 * the script deletes its accounts, `unrobot` takes the lines away. A line left
 * with its account (a run cut off) is a leftover: the console's «التجربة» page
 * counts them and sweeps them.
 *
 *   const digits = await robot(admin, phoneNo());   // then make the account
 *   …
 *   await unrobot(admin, [digits]);                 // after deleting it
 */
export async function robot(admin, digits) {
  const { error } = await admin.from("robots").upsert({ phone: `+216${digits}` });
  if (error) throw new Error(`robots list: ${error.message}`);
  return digits;
}

export async function unrobot(admin, digitsList) {
  const phones = digitsList.filter(Boolean).map((d) => `+216${d}`);
  if (phones.length) await admin.from("robots").delete().in("phone", phones);
}
