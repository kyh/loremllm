"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/field";
import { Input } from "@repo/ui/input";
import { toast } from "@repo/ui/toast";
import { cn } from "@repo/ui/utils";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  type: "login" | "register";
} & React.HTMLAttributes<HTMLDivElement>;

export const AuthForm = ({ className, type, ...props }: AuthFormProps) => {
  const router = useRouter();
  const params = useParams<{ nextPath?: string }>();
  const [submittingGithub, setSubmittingGithub] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }),
    },
    onSubmit: async ({ value }) => {
      if (type === "register") {
        const emailPrefix = value.email.split("@")[0];
        await authClient.signUp.email({
          email: value.email,
          password: value.password,
          name: emailPrefix ?? "User",
          fetchOptions: {
            onSuccess: () => {
              router.replace(params.nextPath ?? "/dashboard");
            },
            onError: (ctx: any) => {
              toast.error(ctx.error.message);
            },
          },
        });
      }

      if (type === "login") {
        await authClient.signIn.email({
          email: value.email,
          password: value.password,
          fetchOptions: {
            onSuccess: () => {
              router.replace(params.nextPath ?? "/dashboard");
            },
            onError: (ctx: any) => {
              toast.error(ctx.error.message);
            },
          },
        });
      }
    },
  });

  const handleAuthWithGithub = async () => {
    setSubmittingGithub(true);
    await authClient.signIn.social({
      provider: "github",
      fetchOptions: {
        onSuccess: () => {
          router.replace(params.nextPath ?? "/dashboard");
        },
        onError: (ctx: any) => {
          toast.error(ctx.error.message);
        },
        onResponse: () => {
          setSubmittingGithub(false);
        },
      },
    });
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Button
        variant="outline"
        type="button"
        loading={submittingGithub}
        onClick={handleAuthWithGithub}
      >
        Continue with Github
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or</span>
        </div>
      </div>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <FieldGroup className="gap-2">
          <form.Field
            name="email"
            validators={{
              onBlur: z.email("Invalid email address"),
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid} className="gap-1">
                  <FieldLabel className="sr-only" htmlFor="email">
                    Email
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="email"
                      data-test="email-input"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={isInvalid}
                      required
                      type="email"
                      placeholder="name@example.com"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                    />
                  </FieldContent>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <form.Field
            name="password"
            validators={{
              onBlur: z.string().min(1, "Password is required"),
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid} className="gap-1">
                  <FieldLabel className="sr-only" htmlFor="password">
                    Password
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="password"
                      data-test="password-input"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={isInvalid}
                      required
                      type="password"
                      placeholder="******"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      autoCorrect="off"
                    />
                  </FieldContent>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>
        <Button loading={form.state.isSubmitting}>
          {type === "login" ? "Login" : "Register"}
        </Button>
      </form>
    </div>
  );
};

export const RequestPasswordResetForm = () => {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
      }),
    },
    onSubmit: async ({ value }) => {
      await authClient.requestPasswordReset({
        email: value.email,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Password reset email sent successfully!");
          },
          onError: (ctx: any) => {
            toast.error(ctx.error.message);
          },
        },
      });
    },
  });

  if (form.state.isSubmitSuccessful) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
          <p className="text-sm text-green-800 dark:text-green-200">
            Password reset email sent! Check your inbox and follow the
            instructions to reset your password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-4">
        <form.Field
          name="email"
          validators={{
            onBlur: z.email("Invalid email address"),
          }}
        >
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid} className="gap-1">
                <FieldLabel className="sr-only" htmlFor="reset-email">
                  Email
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="reset-email"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    required
                    type="email"
                    placeholder="name@example.com"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                  />
                </FieldContent>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>
      <Button loading={form.state.isSubmitting}>Request Password Reset</Button>
    </form>
  );
};

export const UpdatePasswordForm = () => {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: z
        .object({
          password: z.string().min(8, "Password must be at least 8 characters"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        }),
    },
    onSubmit: async ({ value }) => {
      await authClient.resetPassword({
        newPassword: value.password,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Password updated successfully!");
            router.push("/dashboard");
          },
          onError: (ctx: any) => {
            toast.error(ctx.error.message);
          },
        },
      });
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-4">
        <form.Field
          name="password"
          validators={{
            onBlur: z.string().min(8, "Password must be at least 8 characters"),
          }}
        >
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid} className="gap-1">
                <FieldLabel className="sr-only" htmlFor="new-password">
                  New Password
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="new-password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    required
                    type="password"
                    placeholder="Enter new password"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect="off"
                  />
                </FieldContent>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field
          name="confirmPassword"
          validators={{
            onChange: ({ value, fieldApi }) => {
              if (!value) {
                return "Confirm your new password";
              }

              const password = fieldApi.form.getFieldValue("password");
              if (password !== value) {
                return "Passwords don't match";
              }
            },
          }}
        >
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid} className="gap-1">
                <FieldLabel className="sr-only" htmlFor="confirm-password">
                  Confirm New Password
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="confirm-password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    required
                    type="password"
                    placeholder="Confirm new password"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect="off"
                  />
                </FieldContent>
                {isInvalid && (
                  <FieldError
                    errors={field.state.meta.errors.map((error) =>
                      typeof error === "string" ? { message: error } : error,
                    )}
                  />
                )}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>
      <Button loading={form.state.isSubmitting}>Update Password</Button>
    </form>
  );
};
