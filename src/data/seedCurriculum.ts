import { CodingProblem, DailyTask, PortfolioProject, UserSkill } from '../types/career.ts';

export interface SeedSkillTemplate {
  id: string;
  name: string;
  category: string;
  score: number;
  targetScore: number;
  basis: string;
}

export const JAVA_BACKEND_SKILLS: SeedSkillTemplate[] = [
  { id: 'core-java', name: 'Core Java', category: 'Core Java', score: 55, targetScore: 85, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'oop', name: 'OOP Principles', category: 'Core Java', score: 60, targetScore: 85, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'collections', name: 'Collections Framework', category: 'Core Java', score: 45, targetScore: 85, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'exception-handling', name: 'Exception Handling', category: 'Core Java', score: 50, targetScore: 80, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'java-8-plus', name: 'Java 8+ Streams & Lambdas', category: 'Core Java', score: 40, targetScore: 85, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'spring-boot', name: 'Spring Boot', category: 'Backend & Frameworks', score: 40, targetScore: 85, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'rest-apis', name: 'REST APIs & Validation', category: 'Backend & Frameworks', score: 48, targetScore: 85, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'microservices', name: 'Microservices Architecture', category: 'Backend & Frameworks', score: 25, targetScore: 75, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'sql', name: 'SQL Queries & Joins', category: 'Databases', score: 45, targetScore: 85, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'postgresql', name: 'PostgreSQL & Indexing', category: 'Databases', score: 35, targetScore: 80, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'hibernate-jpa', name: 'Hibernate / Spring Data JPA', category: 'Databases', score: 35, targetScore: 80, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'dsa', name: 'Data Structures & Algorithms', category: 'DSA & System Design', score: 35, targetScore: 80, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'system-design', name: 'System Design Fundamentals', category: 'DSA & System Design', score: 25, targetScore: 70, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'git', name: 'Git & Branching Workflows', category: 'DevOps & Cloud', score: 60, targetScore: 80, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'docker', name: 'Docker & Containers', category: 'DevOps & Cloud', score: 30, targetScore: 75, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'cloud-fundamentals', name: 'Cloud Fundamentals (AWS/GCP)', category: 'DevOps & Cloud', score: 25, targetScore: 70, basis: 'Seeded baseline — verify via Skill Assessment' },
  { id: 'communication', name: 'Technical Communication', category: 'Soft Skills', score: 55, targetScore: 80, basis: 'Seeded baseline — verify via Skill Assessment' },
];

export const JAVA_CODING_PROBLEMS: CodingProblem[] = [
  {
    id: 'java-two-sum-orders',
    title: 'Find Matching Payment Pair (Two Sum)',
    difficulty: 'Easy',
    topic: 'Collections & HashMap',
    statement:
      'Given an integer array `amounts` representing transaction values in INR and an integer `targetSum`, return the 0-based indices of two distinct transactions whose amounts add up to `targetSum`. Aim for O(n) time complexity using a HashMap.',
    examples: [
      {
        input: 'amounts = [1200, 4500, 2800, 3500], targetSum = 8000',
        output: '[1, 3]',
        explanation: 'amounts[1] + amounts[3] = 4500 + 3500 = 8000.',
      },
      {
        input: 'amounts = [500, 500], targetSum = 1000',
        output: '[0, 1]',
        explanation: 'Distinct indices 0 and 1 sum to 1000.',
      },
    ],
    hints: [
      'Iterate once over the array and check if (targetSum - amounts[i]) is already stored in a Map<Integer, Integer>.',
      'Store the current value and its index after checking so the same element is never reused.',
    ],
    expectedConcepts: ['HashMap<Integer, Integer>', 'O(n) single-pass lookup', 'Edge-case handling for empty/null array'],
    starterCode: `import java.util.*;

public class PaymentPairFinder {
    public static int[] findTransactionPair(int[] amounts, int targetSum) {
        // TODO: Return indices of two transactions adding up to targetSum
        return new int[]{-1, -1};
    }
}`,
  },
  {
    id: 'java-streams-top-departments',
    title: 'Aggregate Top Earning Employees per Department',
    difficulty: 'Medium',
    topic: 'Java 8+ Streams & Grouping',
    statement:
      'Given a `List<Employee>` (each with `name`, `department`, and `salaryLpa`), write a Java method using Streams (`Collectors.groupingBy`) that returns a `Map<String, Optional<Employee>>` mapping each department to its highest-paid employee.',
    examples: [
      {
        input: '[(Asha, Backend, 11.5), (Rohan, Backend, 9.0), (Meera, Data, 12.0)]',
        output: '{Backend -> Asha (11.5), Data -> Meera (12.0)}',
        explanation: 'Grouped by department and reduced with Comparator.comparingDouble.',
      },
    ],
    hints: [
      'Use employees.stream().collect(Collectors.groupingBy(Employee::getDepartment, Collectors.maxBy(...))).',
      'Guard against null lists or null employee entries.',
    ],
    expectedConcepts: ['Collectors.groupingBy', 'Collectors.maxBy', 'Comparator.comparingDouble', 'Null safety'],
    starterCode: `import java.util.*;
import java.util.stream.Collectors;

public class DepartmentAnalytics {
    record Employee(String name, String department, double salaryLpa) {}

    public static Map<String, Optional<Employee>> topEarnerByDepartment(List<Employee> employees) {
        // TODO: Implement using Java Streams
        return Map.of();
    }
}`,
  },
  {
    id: 'java-lru-cache',
    title: 'Thread-Safe Bounded LRU Cache',
    difficulty: 'Medium',
    topic: 'Collections, LinkedHashMap & Concurrency',
    statement:
      'Design a generic `LRUCache<K, V>` in Java with a fixed capacity. Implement `get(K key)` and `put(K key, V value)` in O(1) average time complexity, evicting the least recently used entry when capacity is exceeded, and ensure safe concurrent access.',
    examples: [
      {
        input: 'capacity = 2; put(1, "A"); put(2, "B"); get(1); put(3, "C");',
        output: 'get(2) returns null, get(1) returns "A"',
        explanation: 'Accessing key 1 marks it most recently used, so key 2 is evicted when 3 is inserted.',
      },
    ],
    hints: [
      'You can extend LinkedHashMap with accessOrder=true and override removeEldestEntry, or pair HashMap with a custom doubly-linked list.',
      'Protect reads and structural mutations with ReentrantLock or synchronized methods because accessOrder LinkedHashMap mutates order on get().',
    ],
    expectedConcepts: ['LinkedHashMap accessOrder', 'O(1) get/put', 'Thread safety with ReentrantLock/synchronized'],
    starterCode: `import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

public class LRUCache<K, V> {
    private final int capacity;

    public LRUCache(int capacity) {
        this.capacity = capacity;
    }

    public V get(K key) {
        // TODO: Return value or null, updating recency safely
        return null;
    }

    public void put(K key, V value) {
        // TODO: Insert or update entry and evict LRU if over capacity
    }
}`,
  },
  {
    id: 'java-rate-limiter-sliding-window',
    title: 'API Sliding Window Rate Limiter',
    difficulty: 'Medium',
    topic: 'DSA & Backend System Design',
    statement:
      'Implement a per-user sliding window rate limiter method `allowRequest(String userId, long timestampMs)` that allows at most `maxRequests` within a rolling `windowMs` interval.',
    examples: [
      {
        input: 'maxRequests = 3, windowMs = 1000; calls at 100, 300, 700, 900, 1150',
        output: 'true, true, true, false, true',
        explanation: 'At t=900 there are 3 requests in [0, 900], so rejected. At t=1150, t=100 has expired (>1000ms old).',
      },
    ],
    hints: [
      'Maintain a Map<String, Deque<Long>> storing timestamps per user.',
      'Before checking size, evict timestamps <= timestampMs - windowMs from the front of the deque.',
    ],
    expectedConcepts: ['Deque / ArrayDeque', 'ConcurrentHashMap', 'Sliding window eviction', 'Synchronization per user key'],
    starterCode: `import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class SlidingWindowRateLimiter {
    private final int maxRequests;
    private final long windowMs;

    public SlidingWindowRateLimiter(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    public boolean allowRequest(String userId, long timestampMs) {
        // TODO: Prune expired timestamps and allow if count < maxRequests
        return false;
    }
}`,
  },
  {
    id: 'java-spring-dto-validation',
    title: 'Idempotent Order Creation Service Logic',
    difficulty: 'Hard',
    topic: 'Spring Boot Service & Transactions',
    statement:
      'Write a Java service method `createOrder(OrderRequest req, String idempotencyKey)` that prevents duplicate order creation under retries, validates stock availability atomically, and returns the existing order when the same idempotency key is replayed.',
    examples: [
      {
        input: 'createOrder(sku="BOOK-1", qty=2, key="idem-99") called twice concurrently',
        output: 'Only 1 order created and stock decremented once; second call returns same OrderResponse',
        explanation: 'Idempotency key lookup + transactional guard prevents double-charging.',
      },
    ],
    hints: [
      'Check an idempotency store/repository before decrementing stock.',
      'Explain or annotate @Transactional boundaries and optimistic locking (@Version) or unique key constraints.',
    ],
    expectedConcepts: ['Idempotency keys', '@Transactional semantics', 'Optimistic vs Pessimistic locking', 'Validation exceptions'],
    starterCode: `import java.util.*;

public class OrderService {
    public record OrderRequest(String sku, int quantity, long amountInPaise) {}
    public record OrderResponse(String orderId, String status) {}

    public OrderResponse createOrder(OrderRequest req, String idempotencyKey) {
        // TODO: Implement validation, idempotency check, and atomic stock update
        return new OrderResponse("ORD-0", "PENDING");
    }
}`,
  },
];

export const SAMPLE_JOB_DESCRIPTIONS = [
  {
    label: 'Java Backend Developer (₹8–12 LPA · Bengaluru)',
    company: 'FinEdge Payments Pvt Ltd',
    jobTitle: 'Java Backend Developer',
    description: `We are looking for a Java Backend Developer (1-3 years experience) to build resilient payment APIs and settlement microservices in Bengaluru.

Responsibilities:
- Design and develop scalable RESTful APIs using Java 17 and Spring Boot 3.
- Optimize PostgreSQL schemas, complex SQL joins, and Hibernate/JPA queries to prevent N+1 issues.
- Implement unit and integration tests using JUnit 5, Mockito, and Testcontainers.
- Containerize services with Docker and collaborate via Git pull requests and CI/CD pipelines.

Required Skills:
- Strong proficiency in Core Java, OOP, Collections, Exception Handling, and Java 8+ Streams.
- Hands-on experience with Spring Boot, Spring Security (JWT), and REST API design.
- Solid understanding of SQL, PostgreSQL indexing, transactions, and Hibernate/JPA.
- Good grasp of Data Structures, Algorithms, and problem solving.

Preferred Skills:
- Exposure to Microservices, Kafka or RabbitMQ, Redis caching, Docker, and AWS/GCP fundamentals.`,
  },
  {
    label: 'Junior Spring Boot Engineer (₹6–9 LPA · Pune/Remote)',
    company: 'CloudStack Logistics',
    jobTitle: 'Software Engineer — Java & Spring Boot',
    description: `Join our core platform team building shipment tracking and warehouse APIs.

Responsibilities:
- Build modular Spring Boot services with clean DTO validation and global exception handling.
- Write maintainable SQL migrations and JPA repositories for PostgreSQL.
- Participate in code reviews, debugging production bottlenecks, and writing automated JUnit tests.

Requirements:
- 0.5–2 years of experience in Java 17+, OOP, Collections, and Multithreading basics.
- Spring Boot, Spring Data JPA, REST APIs, JSON handling, and Git.
- Strong SQL fundamentals (joins, group by, indexing) and DSA fundamentals.
- Good communication skills and willingness to learn Docker and System Design.`,
  },
];

export function buildSeedDailyTasks(uid: string, dateIso: string): Omit<DailyTask, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      uid,
      date: dateIso,
      roadmapId: 'seed-roadmap',
      topicTitle: 'HashMap Internals & Equals/HashCode Contract',
      category: 'Core Java',
      durationMinutes: 30,
      learningContent:
        'In Java 8+, HashMap uses an array of buckets where collisions start as a linked list and treeify into a balanced Red-Black tree when a bucket exceeds 8 nodes (and capacity >= 64). Always override both equals() and hashCode() together so equal objects produce identical hash codes.',
      practiceQuestion:
        'What happens if you override equals() on a custom Employee key class used in a HashMap without overriding hashCode()? Explain how lookup fails.',
      userAnswer: '',
      aiFeedback: '',
      score: 0,
      status: 'pending',
      completedDate: '',
      isSeeded: true,
    },
    {
      uid,
      date: dateIso,
      roadmapId: 'seed-roadmap',
      topicTitle: 'Spring Boot IoC Container & Bean Scopes',
      category: 'Spring Boot',
      durationMinutes: 30,
      learningContent:
        'Spring Inversion of Control (IoC) manages object creation and dependency injection via ApplicationContext. Prefer constructor injection for mandatory dependencies so beans are immutable and easy to unit-test without reflection.',
      practiceQuestion:
        'Why is constructor injection preferred over @Autowired field injection in Spring Boot production services?',
      userAnswer: '',
      aiFeedback: '',
      score: 0,
      status: 'pending',
      completedDate: '',
      isSeeded: true,
    },
    {
      uid,
      date: dateIso,
      roadmapId: 'seed-roadmap',
      topicTitle: 'PostgreSQL B-Tree Indexing & Query Plans',
      category: 'SQL & Databases',
      durationMinutes: 30,
      learningContent:
        'B-Tree indexes accelerate equality (=) and range (<, >, BETWEEN) filters as well as ORDER BY on indexed prefixes. Use EXPLAIN ANALYZE to spot sequential scans on large tables and composite indexes when filtering on multiple columns.',
      practiceQuestion:
        'Given a table orders(id, user_id, status, created_at), why does an index on (user_id, created_at) help a query filtering only by user_id, whereas it does not optimize a query filtering only by created_at?',
      userAnswer: '',
      aiFeedback: '',
      score: 0,
      status: 'pending',
      completedDate: '',
      isSeeded: true,
    },
    {
      uid,
      date: dateIso,
      roadmapId: 'seed-roadmap',
      topicTitle: 'Two-Pointer & Sliding Window Patterns',
      category: 'DSA Practice',
      durationMinutes: 30,
      learningContent:
        'Sliding window turns O(n^2) contiguous subarray problems into O(n) by expanding a right pointer and shrinking a left pointer whenever the window constraint is violated.',
      practiceQuestion:
        'Explain the time and space complexity of finding the longest substring without repeating characters using a HashSet or int[128] index array.',
      userAnswer: '',
      aiFeedback: '',
      score: 0,
      status: 'pending',
      completedDate: '',
      isSeeded: true,
    },
  ];
}

export function buildSeedPortfolioProject(uid: string): Omit<PortfolioProject, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    uid,
    title: 'LedgerFlow — Idempotent Wallet & Expense API (Starter Blueprint)',
    difficulty: 'Intermediate (₹9 LPA Portfolio Standard)',
    targetRole: 'Java Backend Developer',
    summary:
      'A production-structured Spring Boot 3 + PostgreSQL wallet and expense ledger supporting JWT authentication, double-entry transfers, idempotency keys, and Flyway migrations.',
    techStack: ['Java 21', 'Spring Boot 3', 'Spring Security (JWT)', 'PostgreSQL', 'Flyway', 'JUnit 5', 'Docker'],
    architectureNotes:
      'Layered architecture: Controller (DTO validation) -> Service (@Transactional boundaries + idempotency guard) -> Repository (Spring Data JPA). Global @RestControllerAdvice returns RFC-7807 ProblemDetail payloads.',
    databaseDesign:
      'Tables: users(id, email, password_hash), wallets(id, user_id, balance_paise, version), ledger_entries(id, wallet_id, amount_paise, type, idempotency_key UNIQUE, created_at).',
    apiSpecs: [
      'POST /api/v1/auth/register — Create user & default wallet',
      'POST /api/v1/auth/login — Issue signed JWT access token',
      'POST /api/v1/transfers — Atomic P2P transfer requiring Idempotency-Key header',
      'GET /api/v1/ledger?page=0&size=20 — Paginated transaction history',
    ],
    milestones: [
      { id: 'm1', title: 'Setup Spring Boot 3 + PostgreSQL + Flyway V1 migration', description: 'Configure Docker Compose Postgres and initial schema.', completed: false },
      { id: 'm2', title: 'Implement JWT Auth & BCrypt Password Hashing', description: 'Secure endpoints with Spring Security filter chain.', completed: false },
      { id: 'm3', title: 'Build Transactional Transfer Service with Optimistic Locking', description: 'Prevent race conditions and duplicate retries via idempotency keys.', completed: false },
      { id: 'm4', title: 'Add JUnit 5 + Mockito & Integration Tests', description: 'Verify insufficient funds, concurrent updates, and rollback.', completed: false },
    ],
    testingChecklist: [
      { id: 't1', item: 'Unit tests for WalletService balance validation (>= 80% branch coverage)', done: false },
      { id: 't2', item: 'Integration test verifying duplicate Idempotency-Key returns same result without double debit', done: false },
      { id: 't3', item: 'Unauthorized requests return HTTP 401/403 without stack traces', done: false },
    ],
    deploymentChecklist: [
      { id: 'd1', item: 'Multi-stage Dockerfile with non-root user', done: false },
      { id: 'd2', item: 'Externalize DB credentials and JWT secret via environment variables', done: false },
      { id: 'd3', item: 'Include OpenAPI/Swagger docs & README curl examples', done: false },
    ],
    resumeBullets: [
      'Engineered an idempotent double-entry wallet REST API in Java 21 & Spring Boot 3 with PostgreSQL and Flyway migrations.',
      'Prevented race conditions and duplicate payment retries using JPA optimistic locking (@Version) and unique idempotency keys.',
      'Secured endpoints via stateless JWT authentication and achieved reliable test coverage with JUnit 5 and Mockito.',
    ],
    isSeeded: true,
  };
}

export function mapSeedSkillsToRecords(uid: string): Omit<UserSkill, 'createdAt' | 'updatedAt'>[] {
  return JAVA_BACKEND_SKILLS.map((s) => ({
    ...s,
    uid,
    source: 'seed',
  }));
}
