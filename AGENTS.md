# AI Reader for faster note-taking
## Overview
This project is to implement an AI-powered note-taking system.

Must Have
1. PDF reader + Note-taking interface, where the left is a PDF viewer and the right is a note-taking area.
   <br> i. Because the user wants to see the PDF file and interact with the pdf file directly.
   <br> ii. In addition, the user wants to take notes while reading the PDF file.
2. Basic LLM interaction.
   <br> i. the user wants to take a screenshot, then ask the llm to explain the screenshot,
   then the user can decide what to be inserted into the notes
   <br> ii. ask for regenerate the output.
3. Export the note to Markdown format.
4. Advanced LLM interation(need to use a vector database to achieve that).
   <br> i. the user can chat with llm to interact with the PDF reader.
   <br> ii. use case 1. I want a table of content. then the llm will summarise the content of the table for the pdf. then the user can decide if he wants to insert the content of table into the note.
## Top-level modules
- `src/` write the code here
- `src/services` backend server goes here, this is where to create classes for business layer.
- `src/services/llm` llm service goes here.
- `src/web` frontend code goes here, this is where to create components for UI layer. Make sure it does not handle any business logic.
- `src/utils` utility functions go here.

## Coding Conventions
Follow GRASP coding principles if applicable:
GRASP Principles with Situations
- Information Expert: When you need to decide which class should perform a calculation, validation, or update, assign the responsibility to the class that already holds the necessary data. Example: if Order knows all its LineItems, then Order should calculate the total price, not Customer or LineItem.
- Creator:When an object A contains or closely works with objects of type B, let A be responsible for creating B. Example: if Order aggregates many LineItems, then Order should create LineItem instances instead of delegating that to some unrelated factory.
- Controller:When the system receives an external event (UI action, API request), assign the handling to a controller object that coordinates between UI and domain objects. Example: when a user clicks "Place Order," a OrderController should validate input and delegate to domain classes, rather than the UI button directly invoking Order.
- Low Coupling:When connecting two classes, check if one can operate without knowing the internals of the other. Prefer interfaces, dependency injection, or intermediaries to minimize hard links. Example: instead of Order calling PayPalService directly, inject a PaymentProcessor interface that can be swapped out later.
- High Cohesion:When adding responsibilities to a class, verify that they all serve a single, focused purpose. If not, split them. Example: don’t let Order also handle logging and email notifications—move those to separate classes.
- Polymorphism:When behavior changes depending on type, use polymorphism instead of conditional logic. Example: instead of if paymentType == CREDIT_CARD ... else if paymentType == PAYPAL, define CreditCardPayment and PayPalPayment subclasses implementing a process() method.
- Pure Fabrication: When no natural class should take on a responsibility, create a new one to keep cohesion and coupling balanced. Example: if many domain objects need to log events, introduce a Logger utility class instead of polluting each domain class with logging code.
- Indirection: When two classes are tightly connected, add an intermediary to reduce direct coupling. Example: instead of Order talking to Database directly, insert a Repository class that manages persistence.
- Protected Variations: When you expect parts of the system to change (e.g., database engine, payment service), isolate them behind stable interfaces. Example: define a PaymentProcessor interface so you can switch from PayPal to Stripe without touching the rest of the code.
  Use Design Patterns Appropriately
  Use patterns only when specific forces are present. Triggers first, anti-triggers second. Keep the simplest design unless a trigger fires.
1. Strategy：
- Trigger: One behavior with ≥3 variants; variant chosen at runtime; variants evolve independently; large if/else on type.
- Avoid if: Only 1–2 stable variants; compile-time choice is fine.
2. Observer (Pub-Sub)
- Trigger: One source, many unknown listeners; need decoupled fan-out; events outlive the source; plugins.
- Avoid if: Exactly one consumer; tight ordering required.
3. Factory Method
- Trigger: A base class must decide which subclass to create for itself; product choice depends on subclass.
- Avoid if: Clients can new concrete types directly without coupling harm.
4. Abstract Factory
- Trigger: Families of related products must be created together and swapped as a set (e.g., UI themes, DB drivers).
- Avoid if: Products are mixed freely across families.
5. Builder
- Trigger: Object has many optional parameters, staged validation, or assembly steps; immutability desired.
- Avoid if: Simple DTO with ≤3 params.
6. Singleton
- Trigger: Exactly one global, stateless service with shared resource coordination (rare: clock, config).
- Avoid if: Tests need isolation; hidden global state. Prefer DI container.
7. Adapter
- Trigger: Third-party or legacy API is incompatible and unchangeable; you must present your interface.
- Avoid if: You control both sides; just change one side.
8. Facade
- Trigger: Subsystem with many types; clients need a narrow entry point and fewer dependencies.
- Avoid if: It adds no real simplification.
9. Decorator
- Trigger: Add responsibilities per instance at runtime; combinations explode with inheritance; open/closed needed.
- Avoid if: One fixed variant; subclassing is simpler.
10. Proxy
- Trigger: Same interface but with lazy loading, remote access, access control, or caching.
- Avoid if: It’s a pass-through with no policy.
11. Command
- Trigger: Actions must be queued, logged, retried, scheduled, or undone/redone; macro commands.
- Avoid if: One immediate call with no history.
12. Template Method
- Trigger: Algorithm skeleton is fixed; 2+ steps vary across subclasses; compile-time selection OK.
- Avoid if: Variants must switch at runtime → use Strategy.
13. State
- Trigger: Object behavior changes by discrete states; clear transition table; many if (state) branches.
- Avoid if: Two booleans suffice; states rarely change.
14. Composite
- Trigger: Tree structures where clients treat leaf and group uniformly (menus, scenes, org charts).
- Avoid if: Data is flat.
15. Repository (enterprise)
- Trigger: Need a domain-level persistence boundary with intent-revealing queries and aggregates.
- Avoid if: Thin CRUD over a single table; a DAO is enough.
16. Dependency Injection
- Trigger: Components depend on abstractions; tests need fakes; runtime wiring varies.
- Avoid if: Small script or single module.
17. MVC/MVP/MVVM
- Trigger: UI where testability and separation of concerns matter; multiple view implementations.
- Avoid if: Trivial screen logic.
## Pre-check before any pattern
Is there a measurable pain now? (branch explosion, change ripple, hard-to-test code, plugin need)
Will this reduce coupling or increase cohesion?
Can a simpler refactor solve it? (extract function, split module, parameterize)

## Modules in the project from a program perspective

### Front-end Modules:
- PDF Reader Module: this module provides an interface for the user to read a PDF file.
  - use case: user wants to read a PDF file.
  - use case: user wants to have multiple PDF files open at the same time.
- PDF Controller Module:
  - use case: user wants to take a screenshot of the PDF reader, then asks the LLM to explain the screenshot, then the user can decide what to be inserted into the notes.
- Note-taking Module: this module provides an interface for the user to take notes.
  - the input is a user's action, such as typing, formating, etc.
  - the output is a note that can be re-created.
- Note-Management Module: this module provides an interface for the user to manage notes.
  - Visualize the notes. Where the user can select a note and perform actions on it.
  - The user can also create a new note.
  - use-case: the user wants to delete notes, so it can help them focus on the important notes.
  - use-case: the user wants to export notes to a Markdown file, so it can help them organize their notes.
- LLM Module: this module provides a comprehensive interaction with the PDF reader module and Note-taking module.
  - use-case: user wants to send messages with an image attached to the LLM, so he can chat with the LLM.
  - use-case: user wants to insert the output of the LLM into the note-taking module.
### Back-end Modules:
- Cloud Service Module: this module provides a cloud service for the user, so the user can use the system across multiple devices.
  - use-case: user wants to log in to the system, so he can use the system across multiple devices.
- Payment System Module: this 


