import { PrismaClient, UserRole } from '../../src/generated/client/client.js';
import { hashPassword } from '../../src/utils/password.js';
import { prisma } from '../../src/lib/prisma.js';



// const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default plans
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Starter',
        description: 'For small teams just getting started',
        maxUsers: 5,
        maxStorage: BigInt(5 * 1024 * 1024 * 1024), // 5GB
        features: {
          basicReports: true,
          apiAccess: false,
          advancedAnalytics: false,
          customRoles: false
        },
        priceMonthly: 999.00,
        priceYearly: 9990.00,
        currency: 'INR',
        isActive: true
      }
    }),
    prisma.plan.create({
      data: {
        name: 'Professional',
        description: 'For growing teams with advanced needs',
        maxUsers: 20,
        maxStorage: BigInt(20 * 1024 * 1024 * 1024), // 20GB
        features: {
          basicReports: true,
          apiAccess: true,
          advancedAnalytics: true,
          customRoles: true
        },
        priceMonthly: 2999.00,
        priceYearly: 29990.00,
        currency: 'INR',
        isActive: true
      }
    }),
    prisma.plan.create({
      data: {
        name: 'Enterprise',
        description: 'For large organizations with custom needs',
        maxUsers: 100,
        maxStorage: BigInt(100 * 1024 * 1024 * 1024), // 100GB
        features: {
          basicReports: true,
          apiAccess: true,
          advancedAnalytics: true,
          customRoles: true,
          dedicatedSupport: true,
          sla: true
        },
        priceMonthly: 9999.00,
        priceYearly: 99990.00,
        currency: 'INR',
        isActive: true
      }
    })
  ]);

  console.log('✅ Plans created:', plans.map(p => p.name).join(', '));

  // Create super admin
  const hashedPassword = await hashPassword('Admin@123456');
  
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@crm.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  console.log('✅ Super admin created:', superAdmin.email);

  // Create sample company with admin
  const company = await prisma.company.create({
    data: {
      name: 'Demo Company',
      industry: 'Technology',
      phone: '+91 9876543210',
      email: 'demo@company.com',
      address: '123 Business Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      planId: plans[1].id, // Professional plan
      subscriptionStatus: 'ACTIVE',
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  });

  console.log('✅ Demo company created:', company.name);

  // Create company admin user
  const companyAdminPassword = await hashPassword('Company@123');
  const companyAdmin = await prisma.user.create({
    data: {
      email: 'company@demo.com',
      passwordHash: companyAdminPassword,
      firstName: 'Company',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  // Link to company
  await prisma.companyUser.create({
    data: {
      companyId: company.id,
      userId: companyAdmin.id,
      employeeCode: `CMP${company.id}ADMIN`,
      systemRole: UserRole.COMPANY_ADMIN,
      isActive: true,
      joiningDate: new Date()
    }
  });

  // Update company user count
  await prisma.company.update({
    where: { id: company.id },
    data: { currentUsers: { increment: 1 } }
  });

  console.log('✅ Company admin created:', companyAdmin.email);

  // Create default permissions
  const resources = ['customer', 'deal', 'activity', 'followup', 'payment', 'report', 'user', 'company'];
  const actions = ['create', 'read', 'update', 'delete', 'manage'];

  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource,
            action
          }
        },
        update: {},
        create: {
          resource,
          action,
          description: `Can ${action} ${resource}`
        }
      });
    }
  }

  console.log('✅ Permissions created');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('Super Admin: admin@crm.com / Admin@123456');
  console.log('Company Admin: company@demo.com / Company@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });