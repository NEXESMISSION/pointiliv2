"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Server-action forms WITHOUT React's automatic reset.
 *
 * `<form action={fn}>` resets every uncontrolled field when the action finishes —
 * so a wrong password or a taken phone number wiped what the person had typed.
 * Submitting through onSubmit keeps the fields exactly as they were.
 */
export function useFormAction<S>(fn: (prev: Awaited<S>, fd: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, actionPending] = useActionState<S, FormData>(fn, initial);
  const [transitionPending, start] = useTransition();
  const submit = (fd: FormData) => start(() => dispatch(fd));
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(new FormData(e.currentTarget));
  };
  return { state, onSubmit, submit, pending: actionPending || transitionPending };
}
