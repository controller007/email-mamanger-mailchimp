// app/api/validate-emails/route.ts
import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);
const lookup = promisify(dns.lookup);

interface EmailValidationResult {
  email: string;
  isValid: boolean;
  hasMxRecord: boolean;
  isReachable: boolean;
  error?: string;
  mxRecords?: dns.MxRecord[];
}

const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

async function validateEmailDomain(
  email: string,
): Promise<EmailValidationResult> {
  const result: EmailValidationResult = {
    email,
    isValid: false,
    hasMxRecord: false,
    isReachable: false,
  };
  try {
    if (!emailRegex.test(email) || email.length > 254) {
      result.error = "Invalid email format";
      return result;
    }
    result.isValid = true;
    const domain = email.split("@")[1];
    if (!domain) {
      result.error = "No domain found";
      return result;
    }
    try {
      const mxRecords = await resolveMx(domain);
      result.mxRecords = mxRecords;
      result.hasMxRecord = mxRecords.length > 0;
      if (!result.hasMxRecord) {
        result.error = "No MX records found";
        return result;
      }
      const reachabilityPromises = mxRecords.slice(0, 3).map(async (mx) => {
        try {
          await lookup(mx.exchange);
          return true;
        } catch {
          return false;
        }
      });
      const reachabilityResults = await Promise.all(reachabilityPromises);
      result.isReachable = reachabilityResults.some(Boolean);
      if (!result.isReachable) {
        result.error = "MX servers not reachable";
      }
    } catch (error) {
      result.error = `MX lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  } catch (error) {
    result.error = `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emails } = body;

    if (!Array.isArray(emails)) {
      return NextResponse.json(
        { error: "Emails must be an array" },
        { status: 400 },
      );
    }
    if (emails.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 emails allowed per request" },
        { status: 400 },
      );
    }

    // Sanitise: drop undefined/non-string entries that can come from CSV parsers
    const cleanEmails = emails
      .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
      .map((e) => e.toLowerCase().trim());

    const validationPromises = cleanEmails.map(async (email) => {
      return Promise.race([
        validateEmailDomain(email),
        new Promise<EmailValidationResult>((resolve) => {
          setTimeout(() => {
            resolve({
              email,
              isValid: emailRegex.test(email),
              hasMxRecord: false,
              isReachable: false,
              error: "Validation timeout",
            });
          }, 5000);
        }),
      ]);
    });

    const results = await Promise.all(validationPromises);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Email validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
