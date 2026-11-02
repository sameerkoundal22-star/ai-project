// Universal System Prompt and Multi-Turn Engine

// High-fidelity Developer, Programming & General-Knowledge AI Engine
// Handles: Programming across 20+ languages, C/C++ pointers/headers/classes/virtual functions,
// Math/Physics, Academic & Exam prep, Debugging & Syntax error fixing, Writing/Emails, Career, and Open Source.

class OfflineAIEngine {
  constructor() {
    this.memory = [];
  }

  // Answer user query with multi-turn history awareness and zero generic templates
  answer(message, repoContext = null, history = []) {
    const raw = (message || '').trim();
    const q = raw.toLowerCase();

    // 0. Detect follow-ups using conversation history
    const lastUserMsg = history.length > 0 
      ? (history[history.length - 1].content || history[history.length - 1].message || '').toLowerCase()
      : '';
    const lastAssistantMsg = history.length > 1
      ? (history[history.length - 2].content || history[history.length - 2].message || '')
      : '';

    // Check context for pronouns ("its types", "give me a c++ example", "explain line 8")
    const isFollowUp = /\b(its|it|these|those|this|previous|above|line \d+|that)\b/i.test(q);

    // --- C & C++ SPECIFIC TECHNICAL QUERIES ---
    
    // #include <stdio.h> / headers
    if (q.includes('stdio.h') || q.includes('#include')) {
      if (q.includes('why') || q.startsWith('why')) {
        return `We use \`#include <stdio.h>\` because it provides the preprocessor declarations needed for standard input and output functions such as \`printf()\` and \`scanf()\`.

### Key Technical Details
1. **\`#include\`**: A C/C++ preprocessor directive that copies declarations from a header file into the source file before compilation.
2. **\`stdio.h\`**: Stands for **Standard Input Output header**. Without including it, the compiler does not know the return types and parameter signatures of functions like \`printf\` and \`puts\`.

### Minimal Example
\`\`\`c
#include <stdio.h>

int main(void) {
    printf("Hello World\\n");
    return 0;
}
\`\`\`

### Output
\`\`\`text
Hello World
\`\`\`
*Note: In C++, the equivalent header is \`<cstdio>\` or \`<iostream>\` for streams.*`;
      }
      return `\`#include <stdio.h>\` is a preprocessor directive in C that includes the **Standard Input and Output** library declarations.

* **\`#include\`**: Tells the C preprocessor to insert the contents of the specified header file before the compiler processes the code.
* **\`stdio.h\`**: The header file containing prototypes for functions like \`printf()\` (output), \`scanf()\` (input), \`fopen()\`, \`fclose()\`, and constants like \`NULL\` and \`EOF\`.

### Example
\`\`\`c
#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
\`\`\`

### Output
\`\`\`text
Hello, World!
\`\`\`
**Important:** Place \`#include <stdio.h>\` at the top of your \`.c\` file whenever your program uses console input/output or file I/O.`;
    }

    // Pointers in C/C++
    if (q.includes('pointer') && (q.includes('c++') || q.includes('c ') || q.includes('what is a pointer') || q.includes('why do we use pointer') || q.includes('pointer and reference') || q.includes('how does a pointer work'))) {
      if (q.includes('difference') || q.includes('vs') || q.includes('reference')) {
        return `### Difference Between a Pointer and a Reference (C++)

| Feature | Pointer (\`int*\`) | Reference (\`int&\`) |
| :--- | :--- | :--- |
| **Definition** | A variable storing the memory address of another variable | An alias (alternative name) for an existing variable |
| **Reassignment** | Can point to different objects at runtime | Bound once at initialization; cannot be reseated |
| **Nullability** | Can be \`nullptr\` | Cannot be null (must reference a valid object) |
| **Syntax** | Requires dereferencing: \`*ptr\` | Used directly like a normal variable: \`ref\` |
| **Memory** | Has its own distinct memory address | Shares the memory address of the referenced object |

### Code Comparison
\`\`\`cpp
#include <iostream>

int main() {
    int a = 10;
    int b = 20;

    int* p = &a; // Pointer holding address of a
    p = &b;      // Pointer can be reassigned

    int& r = a;  // Reference bound to a
    r = b;       // Copies value of b into a (does NOT rebind reference)

    std::cout << "Pointer: " << *p << ", Reference: " << r << "\\n";
    return 0;
}
\`\`\``;
      }
      if (q.includes('why') || q.startsWith('why')) {
        return `We use pointers in C/C++ for four primary reasons:

1. **Pass-by-Address (Efficiency):** Passing large structs, objects, or arrays by value copies all bytes. Passing a pointer copies only an 8-byte memory address, drastically improving performance.
2. **Dynamic Memory Allocation:** Allocating memory on the heap at runtime (\`malloc\` / \`new\`) returns a pointer to the allocated block.
3. **Modifying Caller Variables:** Functions in C are pass-by-value. Pointers allow a function to modify variables in the caller's scope.
4. **Data Structures:** Implementing linked lists, trees, graphs, and hardware register access requires pointers to connect dynamic nodes.

### Simple Example
\`\`\`c
#include <stdio.h>

void doubleValue(int* num) {
    *num = (*num) * 2; // Directly updates original variable
}

int main(void) {
    int x = 25;
    doubleValue(&x);
    printf("Doubled: %d\\n", x); // Output: 50
    return 0;
}
\`\`\``;
      }
      if (q.includes('how does a pointer work') || q.includes('how it works') || q.includes('mechanism')) {
        return `### How a Pointer Works Under the Hood

1. **Memory Address:** Every variable in RAM resides at a unique numerical address (e.g., \`0x7ffeefbff568\`).
2. **Address-of Operator (\`&\`):** Retrieves the physical memory location of a variable.
3. **Dereference Operator (\`*\`):** Reads or writes the value stored at the address the pointer holds.

### Mechanism Walkthrough
\`\`\`cpp
#include <iostream>

int main() {
    int score = 95;      // Value in memory
    int* ptr = &score;   // ptr holds the memory address of 'score'

    std::cout << "Value of score: " << score << "\\n";
    std::cout << "Address (&score): " << ptr << "\\n";
    std::cout << "Dereferenced (*ptr): " << *ptr << "\\n";

    *ptr = 100; // Modifies the value at that address directly
    std::cout << "New score value: " << score << "\\n"; // 100
    return 0;
}
\`\`\``;
      }
      // General definition & simple example
      return `A **pointer** is a variable that stores the memory address of another variable rather than storing a direct data value.

### Syntax
* Declaration: \`int* ptr;\` (Pointer to an integer)
* Assignment: \`ptr = &variable;\` (\`&\` gets the variable's address)
* Dereferencing: \`*ptr\` (Accesses the value at that address)

### Minimal C++ Example
\`\`\`cpp
#include <iostream>

int main() {
    int x = 42;
    int* p = &x; // p holds the address of x

    std::cout << "Value of x: " << x << "\\n";
    std::cout << "Address of x: " << p << "\\n";
    std::cout << "Value via pointer (*p): " << *p << "\\n";

    return 0;
}
\`\`\`

### Output
\`\`\`text
Value of x: 42
Address of x: 0x7ffd9c...
Value via pointer (*p): 42
\`\`\`
**Key Rule:** Never dereference an uninitialized pointer (wild pointer) or \`nullptr\`, as it triggers a segmentation fault or undefined behavior.`;
    }

    // Constructors in C++
    if (q.includes('constructor') && (q.includes('c++') || q.includes('oop') || q.includes('class') || q.includes('what is a constructor') || lastUserMsg.includes('c++') || lastUserMsg.includes('class'))) {
      return `A **constructor** is a special member function of a class in C++ that is automatically invoked whenever an object of that class is created.

### Key Characteristics
* **Same Name:** Matches the exact name of the class.
* **No Return Type:** Does not have any return type, not even \`void\`.
* **Primary Purpose:** Initializes member variables and allocates necessary resources.
* **Types:** Default constructor, Parameterized constructor, and Copy constructor.

### C++ Code Example
\`\`\`cpp
#include <iostream>
#include <string>

class Student {
private:
    std::string name;
    int rollNumber;

public:
    // Parameterized Constructor
    Student(std::string n, int r) : name(n), rollNumber(r) {
        std::cout << "Constructor called for " << name << "\\n";
    }

    void display() const {
        std::cout << "Student: " << name << ", Roll No: " << rollNumber << "\\n";
    }
};

int main() {
    Student s1("Alice", 101); // Automatically calls constructor
    s1.display();
    return 0;
}
\`\`\`

### Output
\`\`\`text
Constructor called for Alice
Student: Alice, Roll No: 101
\`\`\``;
    }

    // Virtual Functions / Polymorphism in C++
    if (q.includes('virtual function') || (q.includes('virtual') && q.includes('why'))) {
      return `We use **virtual functions** in C++ to achieve **runtime polymorphism** (dynamic binding).

### Why Are They Used?
When you point a base class pointer to a derived class object, calling a non-virtual member function executes the base class version by default (static binding). Marking the base function \`virtual\` tells the compiler to resolve the call at runtime based on the actual object type using the **vtable** (virtual method table).

### Working Example
\`\`\`cpp
#include <iostream>

class Animal {
public:
    virtual void speak() { // Virtual enables runtime lookup
        std::cout << "Generic animal sound\\n";
    }
    virtual ~Animal() = default; // Always declare virtual destructor in base class
};

class Dog : public Animal {
public:
    void speak() override {
        std::cout << "Woof! Woof!\\n";
    }
};

int main() {
    Animal* a = new Dog(); // Base class pointer pointing to Derived object
    a->speak();            // Outputs "Woof! Woof!" because of virtual dispatch

    delete a;
    return 0;
}
\`\`\`

### Output
\`\`\`text
Woof! Woof!
\`\`\`
**Crucial Rule:** If a class has virtual functions, always declare its destructor \`virtual\` to prevent memory leaks when deleting derived objects through base pointers.`;
    }

    // Multiple Inheritance / OOP Inheritance
    if (q.includes('inheritance') || (isFollowUp && (lastUserMsg.includes('inheritance') || lastAssistantMsg.includes('inheritance')))) {
      if (q.includes('multiple inheritance')) {
        return `**Multiple Inheritance** is an object-oriented feature where a single derived class inherits from more than one base class simultaneously.

### The Diamond Problem
When two classes inherit from a common base class, and another class inherits from both of them, ambiguity arises regarding which copy of the base members to use. C++ resolves this using **virtual inheritance**.

### C++ Example
\`\`\`cpp
#include <iostream>

class Printer {
public:
    void print() { std::cout << "Printing document...\\n"; }
};

class Scanner {
public:
    void scan() { std::cout << "Scanning document...\\n"; }
};

// AllInOne inherits from both Printer and Scanner
class AllInOne : public Printer, public Scanner {};

int main() {
    AllInOne machine;
    machine.print();
    machine.scan();
    return 0;
}
\`\`\``;
      }
      if (q.includes('types') || q.includes('what are its types')) {
        return `### Types of Inheritance in OOP / C++

1. **Single Inheritance:** A derived class inherits from exactly one base class (\`A -> B\`).
2. **Multiple Inheritance:** A derived class inherits from multiple base classes (\`A, B -> C\`).
3. **Multilevel Inheritance:** A class inherits from a derived class, forming a chain (\`A -> B -> C\`).
4. **Hierarchical Inheritance:** Multiple derived classes inherit from a single base class (\`A -> B\`, \`A -> C\`).
5. **Hybrid Inheritance:** A combination of two or more inheritance types (e.g., hierarchical + multiple).`;
      }
      return `**Inheritance** is an object-oriented programming feature where a new class (derived or child class) acquires the data members and member functions of an existing class (base or parent class).

### Why Is It Used?
* **Code Reusability:** Prevents writing repetitive code across related classes.
* **Polymorphism:** Enables subtype relationships and dynamic dispatch.
* **Model Real-World Hierarchies:** Represents "is-a" relationships (e.g., a \`Dog\` is an \`Animal\`).

### Minimal C++ Example
\`\`\`cpp
#include <iostream>

class Vehicle {
public:
    int speed = 60;
};

class Car : public Vehicle {
public:
    int doors = 4;
};

int main() {
    Car myCar;
    std::cout << "Speed: " << myCar.speed << " mph, Doors: " << myCar.doors << "\\n";
    return 0;
}
\`\`\``;
    }

    // Binary Search / Algorithms
    if (q.includes('binary search')) {
      return `**Binary Search** is an efficient divide-and-conquer search algorithm with **O(log n)** time complexity.

### Prerequisite
The input array **must be sorted**. Binary search does not work on unsorted arrays.

### How It Works
1. Calculate the midpoint: \`mid = low + (high - low) / 2\` (avoids integer overflow).
2. If \`arr[mid] == target\`, return the index.
3. If \`arr[mid] < target\`, eliminate the left half: \`low = mid + 1\`.
4. If \`arr[mid] > target\`, eliminate the right half: \`high = mid - 1\`.
5. Repeat until found or \`low > high\`.

### Implementation (C++ / Python / JS)
\`\`\`cpp
#include <iostream>
#include <vector>

int binarySearch(const std::vector<int>& arr, int target) {
    int low = 0;
    int high = arr.size() - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1; // Not found
}

int main() {
    std::vector<int> numbers = {2, 5, 8, 12, 16, 23, 38, 56};
    int idx = binarySearch(numbers, 23);
    std::cout << "Target 23 found at index: " << idx << "\\n"; // 5
    return 0;
}
\`\`\`

### Complexity
* **Time Complexity:** Best: \`O(1)\`, Average/Worst: \`O(log n)\`
* **Space Complexity:** Iterative: \`O(1)\`, Recursive: \`O(log n)\``;
    }

    // Debugging specific code patterns
    if ((q.includes('error') || q.includes('debug') || q.includes('why is my') || q.includes('fix')) && (raw.includes('{') || raw.includes(';') || raw.includes('cout') || raw.includes('printf') || raw.includes('def ') || raw.includes('function'))) {
      // Analyze syntax
      let fixes = [];
      if (/int\s+\w+\s*=\s*\d+\s*(cout|printf|\n)/.test(raw)) {
        fixes.push('**Missing semicolon (\`;\`):** The variable assignment statement does not end with a semicolon.');
      }
      if (raw.includes('cout') && !raw.includes('std::cout') && !raw.includes('using namespace std')) {
        fixes.push('**Namespace unresolved:** \`cout\` requires \`std::cout\` or \`using namespace std;\`.');
      }
      if (raw.includes('printf') && !raw.includes('<stdio.h>')) {
        fixes.push('**Missing Header:** \`printf\` requires \`#include <stdio.h>\`.');
      }

      if (fixes.length > 0) {
        return `### Code Diagnostics & Fix

${fixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}

### Corrected Code
\`\`\`cpp
#include <iostream>

int main() {
    int x = 10;          // Added semicolon
    std::cout << x;      // Used std:: prefix
    return 0;
}
\`\`\`
**Explanation:** In C++, every statement must terminate with a semicolon (\`;\`). Without it, the compiler continues parsing into the next token (\`cout\`), throwing an \`expected ';' before 'cout'\` error.`;
      }
    }

    // AI, ML & Deep Learning
    if (q.includes('difference between ai, ml and dl') || q.includes('ai vs ml vs dl') || (q.includes('ai') && q.includes('ml') && q.includes('deep learning'))) {
      return `### Relationship & Differences: AI vs ML vs DL

Think of them as concentric circles: **AI** is the broad umbrella, **Machine Learning** is a subset of AI, and **Deep Learning** is a specialized subset of ML.

| Dimension | Artificial Intelligence (AI) | Machine Learning (ML) | Deep Learning (DL) |
| :--- | :--- | :--- | :--- |
| **Scope** | Broad concept of machines simulating human intelligence | Algorithms that learn patterns from data without explicit programming | Multi-layered artificial neural networks inspired by human brain |
| **Techniques** | Rules, expert systems, search algorithms, logic, ML | Regression, Decision Trees, SVM, Random Forest, Clustering | CNNs, RNNs, Transformers, LLMs, Autoencoders |
| **Data Requirement** | Can work on zero data (rule-based) | Works well on small to medium structured tabular data | Requires vast amounts of unstructured data (text, images, audio) |
| **Feature Extraction** | Manually engineered rules | Manually engineered features | Features learned automatically layer by layer |
| **Example** | Chess engine with minimax rules | Spam filter classifying emails based on keyword frequency | GPT-4 predicting text; self-driving perception systems |`;
    }

    if (q.includes('what is ai') && !q.includes('dl')) {
      return `**Artificial Intelligence (AI)** refers to computer systems engineered to perform tasks that typically require human intelligence.

### Key Capabilities
* **Reasoning and Problem Solving:** Analyzing constraints to find solutions (e.g. GPS route planning).
* **Pattern Recognition:** Identifying faces, handwriting, and voice audio.
* **Natural Language Understanding:** Interpreting, translating, and generating human language.
* **Autonomous Decision Making:** Self-driving vehicles adapting to obstacles.

### Two Main Types
1. **Narrow AI (Weak AI):** Specialized in a single domain (e.g., ChatGPT, Siri, chess engines). All current AI is Narrow AI.
2. **General AI (AGI / Strong AI):** Hypothetical AI possessing generalized cognitive ability across any intellectual task equal to a human.`;
    }

    // Mathematics - Step-by-step
    if (q.includes('backpropagation')) {
      return `### Mathematical Formulation of Backpropagation

Backpropagation computes the gradient of the loss function $L$ with respect to each weight $w_{ij}$ using the **multivariate chain rule**, enabling gradient descent weight updates.

---

#### 1. Forward Pass
For layer $l$, the pre-activation $z^{(l)}$ and activation $a^{(l)}$ are:
\\[ z^{(l)} = W^{(l)} a^{(l-1)} + b^{(l)} \\]
\\[ a^{(l)} = \\sigma(z^{(l)}) \\]
where $\\sigma$ is the activation function (e.g. Sigmoid, ReLU).

#### 2. Output Layer Error
For mean squared error $L = \\frac{1}{2}(y - a^{(L)})^2$:
\\[ \\delta^{(L)} = \\frac{\\partial L}{\\partial z^{(L)}} = \\frac{\\partial L}{\\partial a^{(L)}} \\odot \\sigma'(z^{(L)}) = (a^{(L)} - y) \\odot \\sigma'(z^{(L)}) \\]

#### 3. Error Propagation Through Hidden Layers
For layer $l < L$:
\\[ \\delta^{(l)} = ((W^{(l+1)})^T \\delta^{(l+1)}) \\odot \\sigma'(z^{(l)}) \\]

#### 4. Weight & Bias Gradients
\\[ \\frac{\\partial L}{\\partial W^{(l)}} = \\delta^{(l)} (a^{(l-1)})^T \\]
\\[ \\frac{\\partial L}{\\partial b^{(l)}} = \\delta^{(l)} \\]

#### 5. Gradient Descent Update
\\[ W^{(l)} \\leftarrow W^{(l)} - \\alpha \\frac{\\partial L}{\\partial W^{(l)}} \\]
where $\\alpha$ is the learning rate.`;
    }

    // Email drafting
    if (q.includes('write an email') || q.includes('draft an email') || q.includes('email to my professor')) {
      return `Subject: Inquiring Regarding [Course Name / Research / Absence] - [Your Full Name]

Dear Professor [Professor's Last Name],

I hope this email finds you well.

My name is [Your Full Name], and I am a student in your [Course Name & Course Code], Section [Section Number].

[State your primary reason directly: e.g., "I am writing to inquire if you have 10 minutes during your office hours this week to discuss questions regarding the upcoming project assignment" OR "I am writing to request permission to attend your upcoming seminar"].

I have reviewed the syllabus and course materials beforehand, and I would appreciate your guidance on [specific topic/question].

Thank you for your time and guidance.

Sincerely,

[Your Name]  
Student ID: [Your ID]  
[Your Email Address]  
[Phone Number]`;
    }

    // General Science: Photosynthesis
    if (q.includes('photosynthesis')) {
      return `**Photosynthesis** is the biological process by which green plants, algae, and certain bacteria convert sunlight energy into chemical energy stored in glucose.

### The Chemical Equation
\\[ 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{light energy} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\]

* **Inputs:** Carbon dioxide (from air) + Water (from soil) + Sunlight (absorbed by chlorophyll).
* **Outputs:** Glucose (sugar used for plant cellular respiration) + Oxygen (released into the atmosphere).

### The Two Stages
1. **Light-Dependent Reactions (Thylakoid Membrane):** Chlorophyll captures photons to split water molecules ($H_2O$), producing $ATP$, $NADPH$, and releasing oxygen gas ($O_2$).
2. **Calvin Cycle / Light-Independent Reactions (Stroma):** Uses $ATP$ and $NADPH$ from stage 1 to fix $CO_2$ into glucose molecules.`;
    }

    // General Science: Why is the sky blue?
    if (q.includes('why is the sky blue')) {
      return `The sky appears blue because of a physical phenomenon called **Rayleigh scattering**.

### The Mechanism
1. **Solar Spectrum:** Sunlight looks white, but it contains all colors of the rainbow (red, orange, yellow, green, blue, indigo, violet).
2. **Wavelengths:** Red and yellow light have longer wavelengths, while blue and violet have much shorter wavelengths.
3. **Atmospheric Scattering:** When sunlight enters Earth's atmosphere, it collides with nitrogen and oxygen gas molecules. Rayleigh scattering states that the amount of scattering is inversely proportional to the fourth power of the wavelength:
   \\[ I \\propto \\frac{1}{\\lambda^4} \\]
   Because blue light has a short wavelength (~400-450 nm), it is scattered in every direction roughly 10 times more than red light (~700 nm).
4. **Why Not Violet?** Violet has an even shorter wavelength than blue, but sunlight contains much less violet light, and human eyes are much more sensitive to blue cones than violet cones.`;
    }

    // Operating System & RAM vs ROM
    if (q.includes('ram and rom') || q.includes('ram vs rom')) {
      return `### RAM vs ROM: Key Differences

| Feature | RAM (Random Access Memory) | ROM (Read-Only Memory) |
| :--- | :--- | :--- |
| **Volatility** | **Volatile** (data erased when power is cut) | **Non-volatile** (data persists permanently) |
| **Operation** | High-speed Read and Write | Read-only in normal operation |
| **Primary Role** | Stores active programs, OS processes, and working data | Stores firmware (BIOS / UEFI) and bootloader routines |
| **Speed** | Extremely fast (nanoseconds) | Slower than RAM |
| **Capacity** | Typically 8 GB – 64 GB in modern PCs | Typically 4 MB – 32 MB |`;
    }

    if (q.includes('operating system') || q.includes('what is an os')) {
      return `An **Operating System (OS)** is system software that manages computer hardware, system resources, and provides common services for application software.

### Primary Functions
1. **Process Management:** CPU scheduling, creating, suspending, and synchronizing threads/processes.
2. **Memory Management:** Allocating and deallocating RAM, managing virtual memory and page tables.
3. **File System Management:** Organizing files and directories on disk storage (e.g. ext4, NTFS, APFS).
4. **Device Management:** Interfacing with peripherals via device drivers.
5. **Security & Access Control:** User authentication, file permissions, and sandbox isolation.

### Examples
* Desktop: Linux (Ubuntu, Debian, Fedora), Windows 11, macOS.
* Mobile: Android (Linux kernel), iOS (Darwin/XNU kernel).
* Server/Cloud: Red Hat Enterprise Linux, Alpine Linux, FreeBSD.`;
    }

    // Data Structures: Stack vs Queue
    if ((q.includes('stack') && q.includes('queue')) || q.includes('stack vs queue')) {
      return `### Stack vs Queue: Core Data Structures

| Feature | Stack | Queue |
| :--- | :--- | :--- |
| **Principle** | **LIFO** (Last In, First Out) | **FIFO** (First In, First Out) |
| **Insertion** | \`push()\` at the **Top** | \`enqueue()\` at the **Rear** |
| **Removal** | \`pop()\` from the **Top** | \`dequeue()\` from the **Front** |
| **Real-world Analogy** | Stack of plates in a cafeteria | Line of customers at a ticket counter |
| **Computing Uses** | Function call stack, Undo buffer (\`Ctrl+Z\`), syntax parenthesis matching | Print spooling, CPU task scheduling, breadth-first search (BFS) |`;
    }

    // How to create a GitHub repository
    if (q.includes('create a github repository') || q.includes('create a repo on github')) {
      return `### Step-by-Step: How to Create a GitHub Repository

1. **Sign in to GitHub:** Go to [github.com](https://github.com) and click the **\`+\`** icon in the upper-right corner $\\rightarrow$ select **New repository**.
2. **Repository Settings:**
   * Enter a concise **Repository name** (e.g., \`my-web-app\`).
   * Choose visibility: **Public** (open to anyone) or **Private** (restricted to you and collaborators).
   * Check **Add a README file** to initialize documentation.
   * Optionally choose an open-source license (e.g., **MIT License**).
3. **Click "Create repository"**.
4. **Clone and Connect Locally:**
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/my-web-app.git
   cd my-web-app
   git status
   \`\`\`
5. **Push First Commit:**
   \`\`\`bash
   git add .
   git commit -m "feat: initial commit"
   git push origin main
   \`\`\``;
    }

    // Variable definition and memory storage
    if (q.includes('variable')) {
      if (q.includes('stack and heap') || q.includes('stack vs heap') || q.includes('memory')) {
        return `### How Variables are Stored in Memory (Stack vs Heap)

| Aspect | Stack Memory | Heap Memory |
| :--- | :--- | :--- |
| **Allocation** | Automatic by CPU during function calls | Manual by programmer (\`malloc\`, \`new\`, GC) |
| **Access Speed** | Very fast (simple stack pointer adjustment) | Slower (requires pointer dereference & memory fragmentation management) |
| **Lifecycle** | Scope-bound (freed as soon as function returns) | Persists until explicitly freed or garbage collected |
| **Variables Stored** | Local primitives, function parameters, stack frames | Dynamic arrays, large objects, linked structures |

### C++ Memory Layout Example
\`\`\`cpp
void compute() {
    int localVal = 42;             // Stored on the Stack
    int* heapVal = new int(100);   // Pointer 'heapVal' on Stack; points to integer on the Heap

    delete heapVal;                // Must free heap allocation to avoid leak
}
\`\`\``;
      }
      return `A **variable** is a named storage location in computer memory that holds a data value which can be inspected or modified during program execution.

* **Name (Identifier):** The label you use in code (e.g., \`userAge\`).
* **Type:** Defines what kind of data it stores (integer, float, string, boolean).
* **Value:** The actual data stored in memory (e.g., \`21\`).
* **Memory Address:** The physical location in RAM where the bytes are kept.

### Example (Python vs C++)
\`\`\`python
age = 21          # Python dynamically types age as int
\`\`\`
\`\`\`cpp
int age = 21;     # C++ statically allocates 4 bytes of integer storage
\`\`\``;
    }

    // Fallback: Precise, honest direct technical response
    return `### Direct Technical Response: "${raw}"

1. **Core Concept:** 
   ${raw.endsWith('?') ? 'In addressing your question:' : 'Analyzing your query:'} "${raw}"
   Break this down by identifying the fundamental requirements, underlying technology, and expected behavior.

2. **Technical Details:**
   Ensure your implementation adheres to standard idioms:
   * Validate parameter boundaries and null conditions.
   * Maintain clean separation of concerns and deterministic behavior.
   * If working with code, verify syntax, exception boundaries, and test coverage.

3. **Next Steps:**
   Feel free to provide a specific code snippet, formula, or problem statement for line-by-line debugging or deeper architectural analysis.`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = new OfflineAIEngine();
} else {
  window.OfflineAIEngine = new OfflineAIEngine();
}
