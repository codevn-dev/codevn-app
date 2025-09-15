import { db } from '../src/lib/database';
import { users } from '../src/lib/database/schema';
import bcrypt from 'bcryptjs';

// Mock data for generating realistic users
const firstNames = [
  'Alex',
  'Jordan',
  'Taylor',
  'Casey',
  'Morgan',
  'Riley',
  'Avery',
  'Quinn',
  'Blake',
  'Cameron',
  'Drew',
  'Emery',
  'Finley',
  'Hayden',
  'Jamie',
  'Kendall',
  'Logan',
  'Parker',
  'Reese',
  'Sage',
  'Skyler',
  'Tatum',
  'River',
  'Phoenix',
  'Indigo',
  'Sage',
  'Rowan',
  'Aspen',
  'Cedar',
  'Willow',
  'Luna',
  'Nova',
  'Aurora',
  'Stella',
  'Iris',
  'Violet',
  'Rose',
  'Lily',
  'Daisy',
  'Poppy',
  'Jasmine',
  'Ivy',
  'Hazel',
  'Sage',
  'Mint',
  'Olive',
  'Sage',
  'Fern',
  'Moss',
  'Forest',
];

const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
];

const domains = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'protonmail.com',
  'example.com',
  'test.com',
  'demo.com',
  'sample.com',
];

const techCompanies = [
  'Google',
  'Microsoft',
  'Apple',
  'Amazon',
  'Meta',
  'Netflix',
  'Uber',
  'Airbnb',
  'Spotify',
  'Slack',
  'Zoom',
  'Shopify',
  'Stripe',
  'Square',
  'Dropbox',
  'Evernote',
  'Trello',
  'Asana',
  'Notion',
  'Figma',
  'Adobe',
  'Salesforce',
  'HubSpot',
  'Zendesk',
  'Intercom',
  'Mixpanel',
  'Segment',
  'Amplitude',
  'Datadog',
  'New Relic',
];

const jobTitles = [
  'Software Engineer',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'Platform Engineer',
  'Cloud Engineer',
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'Data Engineer',
  'Machine Learning Engineer',
  'Security Engineer',
  'Infrastructure Engineer',
  'Systems Administrator',
  'Database Administrator',
  'Technical Lead',
  'Engineering Manager',
  'Product Manager',
  'Scrum Master',
  'QA Engineer',
  'Test Engineer',
  'Automation Engineer',
  'Release Engineer',
  'Build Engineer',
];

const locations = [
  'San Francisco',
  'New York',
  'Seattle',
  'Austin',
  'Boston',
  'Denver',
  'Portland',
  'Chicago',
  'Los Angeles',
  'San Diego',
  'Miami',
  'Atlanta',
  'Dallas',
  'Houston',
  'Phoenix',
  'Nashville',
  'Remote',
  'London',
  'Berlin',
  'Amsterdam',
  'Toronto',
  'Vancouver',
  'Sydney',
  'Melbourne',
];

function generateRandomUser() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const company = techCompanies[Math.floor(Math.random() * techCompanies.length)];
  const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];

  // Generate email
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;

  // Generate name
  const name = `${firstName} ${lastName}`;

  // Generate password (same for all mock users for simplicity)
  const password = 'password123';

  // Generate bio/description
  const bio = `${jobTitle} at ${company} based in ${location}. Passionate about software development, automation, and building scalable systems.`;

  return {
    name,
    email,
    password,
    bio,
    company,
    jobTitle,
    location,
  };
}

async function createMockUsers() {
  try {
    console.log('🚀 Creating 100 mock users...');

    const mockUsers = [];
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Generate 100 mock users
    for (let i = 0; i < 100; i++) {
      const userData = generateRandomUser();
      mockUsers.push({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: 'user' as const,
        avatar: null,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
        updatedAt: new Date(),
      });
    }

    // Insert users in batches to avoid database limits
    const batchSize = 20;
    let created = 0;

    for (let i = 0; i < mockUsers.length; i += batchSize) {
      const batch = mockUsers.slice(i, i + batchSize);

      try {
        await db().insert(users).values(batch);
        created += batch.length;
        console.log(
          `✅ Created batch ${Math.floor(i / batchSize) + 1}: ${created}/${mockUsers.length} users`
        );
      } catch (error) {
        console.error(`❌ Error creating batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Continue with next batch
      }
    }

    console.log(`🎉 Successfully created ${created} mock users!`);
    console.log('');
    console.log('📊 User Statistics:');
    console.log(`   Total users: ${created}`);
    console.log(`   Role: user (100%)`);
    console.log(`   Password: password123 (for all users)`);
    console.log('');
    console.log('🔑 Login credentials for testing:');
    console.log('   Email: [any generated email]');
    console.log('   Password: password123');
    console.log('');
    console.log('💡 You can now test the admin panel with a large user list!');
  } catch (error) {
    console.error('❌ Error creating mock users:', error);
  }
}

// Run the script
createMockUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
