# Profile Mapping: Laravel to Next.js + NestJS

## 1. Feature Parity Matrix

| Feature / Action | Laravel Implementation (`fiewin`) | Next.js + NestJS Target (`gaming-platform`) | Status |
| :--- | :--- | :--- | :--- |
| **Profile Page Route** | `GET /profile` (`ProfileController@index`) | `GET /profile` (`apps/web/src/app/profile/page.tsx`) | Planned |
| **User Header** | Display Name, Phone, Email, `STATUS` badge, `KYC` status badge | Fetched via `GET /api/v1/auth/me` from NestJS backend | Planned |
| **Bank Accounts List** | `$bankAccounts = BankAccount::where('user_id', $user->id)->get()` | `GET /api/v1/users/bank-accounts` | Planned |
| **Add Bank Account** | `POST /profile/add-bank` (`ProfileController@addBankAccount`) | `POST /api/v1/users/bank-accounts` | Planned |
| **Update Password** | `POST /profile/update-password` (`ProfileController@updatePassword`) | `POST /api/v1/auth/update-password` | Planned |
| **KYC Submission** | `POST /profile/submit-kyc` (`ProfileController@submitKYC`) | Display current status (`NOT_SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`) | Planned |
| **Legal & Support** | Links to `/privacy`, `/terms`, `/responsible-gaming`, `/legal-availability`, `/security`, `/contact` | Next.js routes (`/privacy`, `/terms`, `/responsible-gaming`, `/legal-availability`, `/security`, `/contact`) | Planned |
| **Logout** | `POST /logout` (`LoginController@logout`) | `POST /api/v1/auth/logout` + clear `localStorage` -> redirect to `/login` | Planned |

---

## 2. Model & Validation Mapping

### User Status
- **Laravel**: `$user->status` (`active`, `suspended`, `banned`)
- **Prisma Schema**: `UserStatus` enum (`ACTIVE`, `SUSPENDED`, `BANNED`)

### KYC Status
- **Laravel**: `$user->kyc_status` (`pending`, `not_submitted`, `approved`, `rejected`)
- **Prisma Schema**: `user.kycStatus` (`NOT_SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`)

### Bank Account Model
- **Laravel Table**: `bank_accounts` (`user_id`, `account_holder`, `bank_name`, `account_number`, `ifsc_code`, `upi_id`, `status`, `is_primary`, `admin_notes`)
- **Prisma Model**: `BankAccount` (`userId`, `holderName`, `bankName`, `accountNumber`, `ifscCode`, `upiId`, `status`, `isPrimary`)

### Bank Account Validation
- `account_holder`: Required, string
- `bank_name`: Required, string
- `account_number`: Required, string, min 6 digits
- `ifsc_code`: Required, string, valid format
- `upi_id`: Optional string

### Password Update Validation
- `current_password`: Required, must match `user.passwordHash`
- `new_password`: Required, min 6 characters
- `confirm_password`: Required, must match `new_password`
