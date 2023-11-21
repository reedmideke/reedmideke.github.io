---
layout: post
title:  "Google Bard explains ARM assembly (badly)"
tags: [ARM, "Google Bard", LLM, AI]
description: "Google Bard claims it can explain code. I asked it to explain some assembly and it did about as well as you'd expect spicy autocomplete to do."
image:
  path: /assets/img/bard-assembly/bard-assembly-preview.png
  height: 1280
  width: 720
  alt: "Thinking face -  ADD    PC, PC, R0,LSL #2 - Add the value of the R0 register, shifted left by 2 bits, to the program counter (PC). This effectively branches to the return address at the top of the stack frame. - Thinking face"

---
While [investigating](https://mastodon.social/@reedmideke/111145548519278884) whether [Google Bard](https://bard.google.com) might (falsely) accuse me of snitching on the mob [like Bing did](https://mastodon.social/@reedmideke/111145019737467667), Bard suggested "explain code" was something it could do. As someone who has spent a lot of time staring at disassembly wishing it came with an explanation, I thought this sounded great[^102] and asked it to explain a bit of [hand written assembly](https://app.assembla.com/spaces/chdk/subversion/source/HEAD/trunk/lib/armutil/callfunc.S) from the [CHDK project](https://chdk.fandom.com/wiki/CHDK).

[^102]: For suitably broad values of "great", inclusive of the sense that "[web3 is going great](https://web3isgoinggreat.com/)".

I picked this code because it's fairly straightforward and short enough to be manageable, but not totally predictable boilerplate. If I encountered it in reverse engineering, a couple things might puzzle me for a few minutes, but it's easily tractable.

If line-by-line explanation of why a chatbot's line-by-line explanation of assembly code is bad ain't your thing, [here's the tl;dr](#the_tl_dr). The main discussion assumes familiarity with assembly concepts, though I suspect much of the wrongness will shine through regardless.

## Notation
Bard's "explanatory" text, including headings and code blocks, is in block quotes, like this:

> Sure. Here is a step-by-step explanation of the assembly language code you provided:

My comments follow Bard's, in regular text like this, with __bold__ for emphasis and `CODE` for mnemonics, register names etc., and footnotes for asides or additional detail[^101].

[^101]: and snark.

## Spoilers
Before getting into Bard's "explanation", here's a quick explanation of what the code __actually__ does.

The assembly file used implements a function with the C signature

```c
unsigned call_func_ptr(void *func, const unsigned *args, unsigned n_args)
```
It calls the function at the address `func` with the `n_args` arguments contained in the array `*args`[^1]. In pseudo-code, something like:
```c
call_func_ptr(func, args, n_args):
    return func(args[0], args[1], ... args[n_args-1])
```

[^1]: Wait, why would you do this, instead of just calling `func` directly? Primarily to allow calling arbitrary firmware code from Lua scripts. In __this__ house, arbitrary code execution is a feature, not a bug.


with arbitrary `args` and `n_args` provided at run time. It's in assembly because this can't be expressed straightforwardly in standard C.[^2]

[^2]: The [stdarg.h va_ macros](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/stdarg.h.html) do roughly the opposite of this, taking variable arguments and turning them into a `va_list`, but functions like vsprintf which accept a `va_list` must be explicitly written to do so. There are of course other ways to achieve the desired result, for example, you could just pick an arbitrary large number of arguments and pass dummies, because, like most C calling conventions, arguments beyond the expected number will just be ignored.

The assembly implementing this amounts a bit over 20 instructions.

## ARM odds and ends
To make the implementation of the above function easier to follow, here's a quick overview of the typical ARM calling convention used on this platform:
* The first four arguments are passed in the registers `R0` through `R3`
* Additional arguments are pushed on the stack such that `SP` points to 5th argument on entry to the called function
* The stack is full (`SP` points a value, not the next free slot), descending (push decrements `SP` by 4)
* Return value is in `R0`
* For our purposes, everything is 32 bit words. Smaller arguments are implicitly promoted, larger are not considered
* Functions are free to modify `R0` through `R3` and `R12`, others must be preserved
* Return address is in `LR`

## The test
Bard's complete "explanation" with the original prompts and without my analysis interspersed is [here](/misc/google-bard-asm/bard-callfunc-original.html). As noted about 3/4 down that page, the initial Bard response appeared to cut off abruptly and I used a second prompt to get more output.

A copy of the original code used is [here](/misc/google-bard-asm/chdk-callfunc-original.html). This includes the comments I stripped out before pasting to the Bard prompt.

## OK Bard, roll for wisdom check
Without further ado, here's Bard's "explanation", and my explanation of why Bard's explanation is crap.

>__Text section:__
>
```assembly
.text
```

> This line tells the assembler that the following code is part of the text section, which contains executable instructions.

>__Global symbol:__
>
```assembly
.global call_func_ptr
```

> This line tells the assembler to make the symbol `call_func_ptr` globally visible. This means that other code modules can call the function at this address.

>__Function definition:__
>
```assembly
call_func_ptr:
```

> This line defines the start of the function `call_func_ptr`.

>__Stack saving:__
>
```assembly
   PUSH   {R4-R5,LR}
```

> This instruction pushes the registers `R4` through `R5` and `LR` onto the stack. This is done to preserve the values of these registers while the function is running.

All of the above is broadly correct, and mostly trivial.

>__Register setup:__
>
```assembly
   MOV    R12, R0
   MOV    R4, SP
```

> These instructions move the values of the `R0` and `SP` registers to the `R12` and `R4` registers, respectively.

Correct, though not terribly informative.

A more useful explanation would note `R0` is the first argument to `call_func_ptr`, and that `R12` is __not__ preserved across calls, so this `MOV` isn't simply saving `R0`. In other words, paying attention to where `R12` crops up later will tell you something about the function and its arguments. OTOH, `R4` is preserved, so `SP` is likely just being saved to make it easy to clean up later stack manipulation.

>__Stack setup:__
>
```assembly
   ADD    R5, R1, R2,LSL #2
   RSBS   R0, R2, #4
   BLO    stack_setup
   ADD    PC, PC, R0,LSL #2
   NOP
```

Here Bard goes off the rails. For starters, the section heading is misleading: The code conditionally branches to a label named `stack_setup` but otherwise has nothing to do with the stack.

> These instructions perform the following steps:

Bard commented on this entire block with bulleted list. For easier reference, I've reproduced the individual instruction under discussion above each bullet point.

>
```assembly
   ADD    R5, R1, R2,LSL #2
````
> 1\. Add the values of the `R1` and `R2` registers, shifted left by 2 bits, to the `R5` register. This calculates the address of the function's stack frame.

The first sentence is only slightly wrong: The result is __stored in__ `R5`, not __added to__ `R5`, which is an important distinction because `R5` is not set in the preceding code of this function and would contain unknown random junk. Read literally, the wording also suggests that __both__ `R1` and `R2` are shifted, when in fact only `R2` is.

It's also uninformative: A human analyzing this function would note that `R1` and `R2` haven't been modified in the code so far, so they are the second and third arguments to `call_func_ptr`. In other words, `R5 = args + 4*n_args`, i.e. the end of the `args` array, with the shift to multiply by 4 because the elements are 32 bit words.[^110]

[^110]: Of course, the arguments aren't named in the code provided to Bard, but `R5 = arg1 + arg2*4` is still far more informative.

As for the second sentence, it's just wrong. As noted above, `R1` and `R2` are both function arguments and nothing in the code connects them to the stack, so the claim this "calculates the address of the function’s stack frame" is pure fiction.

Throughout its "explanation", Bard refers to "the function", which is ambiguous in that it could be read to refer to the function `call_func_ptr` being explained, or the `func` argument to it. References to "stack frame" are similarly ambiguous: I wouldn't call `args` a stack frame, but to the extent one can credit Bard's "explanation" with referring to anything that exists in the code at all, it sometimes seems to.

>
```assembly
   RSBS   R0, R2, #4
```
> 2\. Subtract 4 from the `R2` register. This is because the function's stack frame will need to store 4 return addresses.

The first part is wrong: `RSB` is a [reverse subtract](https://developer.arm.com/documentation/dui0489/i/arm-and-thumb-instructions/rsb), so this is `R0 = 4 - n_args`. The S indicates flags should be set, so that subsequent instructions can be conditional on things like whether the result was zero, negative, etc.

The rest is just gobbledygook: There is nothing involving a return address, never mind four of them(?!), and __nothing__ in the code to suggest there might be. The entire "because" sentence is pure invention. The "explanation" isn't even self consistent: Given stack elements and addresses are 32 bit, an offset of 4 would only accommodate one.

>
```assembly
   BLO    stack_setup
```
> 3\. Branch to the `stack_setup` label if the `R2` register is less than zero. This means that the stack frame is too large and the function needs to return an error.

The first sentence is wrong: The branch is taken if `R0` (the result of `4 - n_args`) was negative, i.e. there were more than four arguments.

The rest is nonsense, it has nothing to do any stack frame being too large, and there is no error involved. It's worth noting that, again, __nothing__ in the source would suggest Bard's "explanation" here to a human reader, it's just completely made up.

>
```assembly
   ADD    PC, PC, R0,LSL #2
```
> 4\. Add the value of the `R0` register, shifted left by 2 bits, to the program counter (PC). This effectively branches to the return address at the top of the stack frame.

The first part is correct, though given that adding to `PC` is obviously calculating an address, "multiplied by 4" would be more informative than "shifted left by 2".

The second part is just nonsense. `R0` is the `4 - n_args` value calculated above, and execution reaches this point only if that value is >= 0. So the result will be an offset of between 0 and 4 instructions within the current function, certainly __not__ the return address or anything on the stack.

Once again, there is __nothing__ in the code which supports Bard's "explanation", mainly because the "explanation" is incoherent. The instruction jumps to the current execution address `PC` plus some offset based on the value in `R0`. The only way this could be the "return address at the top of the stack frame" is if you contrived to set the value of `R0` such that the math adds up to whatever that value is, and nothing the code remotely suggests that.


>
```assembly
   NOP
```
> 5\. Insert a NOP instruction. This is necessary because the branch instruction in the previous step takes up two bytes, but the PC must be aligned on a four-byte boundary.

This is completely wrong. The code is classic ARM (as opposed to Thumb, Thumb2 or AArch64)[^3], so all instructions are exactly four bytes, aligned by four. The `NOP` is present because of ARM's somewhat baroque rules for arithmetic operations involving `PC`, which in this case ends up being the address of the instruction +8[^4].

[^3]: In fairness, I didn't tell Bard what architecture or dialect the code is, but it should be recognizable to someone trained on the entire internet, and if the dialect is unknown, there would certainly be no justification for assuming the branch was two bytes or that instructions needed to be four byte aligned. In fact, outside of a few special cases, ARM dialects that include 16 bit instructions are generally two byte aligned.

[^4]: Since it would never be executed, it doesn't actually need to be a `NOP`.

But all of that is just a warmup, because Bard's "explanation" simply ignored a section of code following the `NOP`, reproduced (with original comments) below, which provides the actual reason for the `ADD`:
```assembly
    LDR     R3, [R5,#-4]!       // fourth arg
    LDR     R2, [R5,#-4]!       // third arg
    LDR     R1, [R5,#-4]!       // second arg
    LDR     R0, [R5,#-4]!       // first arg
    B       do_call             // regs done
stack_setup:
    SUB     R2, R2, #4          // number of stack args
    SUB     R2, R5, R2,LSL #2   // last = src - (n_stack_args)*4
```
As the comments explain, the jump calculated by `ADD PC,...` above is used to set only required registers[^5], in the case that there are four or fewer arguments.  Any reasonably knowledgable human analyzing this code would group the `LDR Rn` lines with the `ADD PC,...` code, since together they form a single logical construct similar to a C `switch`.

We also find the `stack_setup` label which Bard spuriously ascribed to error handling earlier, but actually handles the case where there are more than four arguments, requiring some to go on the stack. This would more logically be grouped with the immediately following code, since the branch to `do_call` above is unconditional, and execution can only arrive at `stack_setup` from the earlier `BLO`.

[^5]: In fact, setting all four would be harmless, since any of `R0` through `R3` not used as arguments are ignored, but without other changes, it would risk running off the end of `args`, though if you want to get sporty, that too would probably also be OK on the platform in question.

Back to Bard's "explanation":

>__Stack setup loop:__
>
```assembly
   LDR    R0, [R5,#-4]!
   STR    R0, [SP,#-4]!
   CMP    R5, R2
   BNE    stack_setup_loop
```

> This loop copies the caller's stack frame to the function's stack frame. The `LDR` instruction loads a value from the stack frame at the address `R5` and decrements `R5`. The `STR` instruction stores the value from `R0` to the stack frame at the address `SP` and decrements `SP`. The `CMP` instruction compares the values of `R5` and `R2`. If `R5` is greater than `R2`, the loop branches back to the beginning.

The first bit is wrong, it's copying from the address contained in `R5`, which is the end the `args` array, not "the callers stack frame". The rest is generally correct, aside from the dubious "stack frame" references. The end condition involving `R2` is not fully explained either, because the value of `R2` was calculated in the `stack_setup` code Bard ignored, but is in the execution path which leads to this loop.

>__Register restoration:__
>
```assembly
   LDMIA  R1, {R0-R3}
```

> This instruction loads the registers `R0` through `R3` from the stack frame at the address `R1` and increments `R1`.

Aside from questionable "stack frame" and "restoration" this is mostly right, but uninformative. A more useful explanation would note `R1` here is the original `args` argument, so this simply copies the first four words, in order, from the start of the array, to `R0` through `R3`. This handles the four register arguments in the case there were more than four total arguments.

It's also incorrect to say it increments `R1`: The `LDMIA` ([load multiple increment after](https://developer.arm.com/documentation/dui0489/i/arm-and-thumb-instructions/ldm)) does load four sequential values starting at the address in `R1`, but `R1` is in the list (`R0` through `R3`) of registers being loaded to, so the value of `R1` is overwritten by the second element of `args`, not incremented.[^103]

[^103]: The writeback form `LDMIA Rn!, ...`, would increment the `R1`, but isn't present in this code and makes no sense if the register is also in the list to be loaded.

>__Function call:__
>
```assembly
   BLX    R12
```

> This instruction branches to the function at the address `R12`.

Correct, though it would be more informative if it mentioned `R12` was the first argument to the `call_func_ptr` function being explained, and `BLX` is specifically a __call__ instruction, which saves the return address in `LR`.

For a human analyst, this would likely be a key point to understanding the whole function: Once you know the first argument is a function pointer, the purpose of the rest of the register shuffling and memory copying should be fairly obvious.

>__Stack cleanup:__
>
```assembly
   MOV    SP, R4
   POP    {R4-R5,LR}
```

> These instructions restore the stack pointer (SP) to its original value and pop the registers `R4` through `R5` and `LR` from the stack.

Correct.

>__Function return:__
>
```assembly
   BX     LR
```

> This instruction branches to the return address stored in the `LR` register.

Correct.

>__Pseudo-code:__

> Here is a pseudo-code representation of the entire function:
>
```
call_func_ptr(func_ptr, arg1, arg2, arg3):
    # Save the calle
```

This is where Bard's initial response ended. At first I just assumed this was Bard being terrible and not forming a coherent story, but eventually I noticed the markdown lacked a closing code tag, the total output was suspiciously close to 32K, and the alternative outputs it offered were similarly truncated. So it seems like this is some kind of content length limit, though the UI provided no indication and a quick search didn't find it explicitly documented.

Anyway, I replied with: "The psuedo-code[^104] above appears incomplete. Please provide complete pseudo-code for the assembly language function you explained previously", and Bard continued:

[^104]: [sic] Yeah, that's a typo and I'm not gonna re-do it.

> Sure, here is a complete pseudo-code representation of the entire assembly language function:

```assembly
call_func_ptr(func_ptr, arg1, arg2, arg3):

    # Save the caller's registers on the stack
    save_registers()

    # Set up the function's stack frame
    setup_stack_frame(func_ptr, arg1, arg2, arg3)

    # Restore the caller's registers
    restore_registers()

    # Call the function
    call_func(func_ptr)

    # Clean up the function's stack frame
    cleanup_stack_frame()

    # Return to the caller
    return()
```

This does capture the fact that `call_func_ptr` calls a function pointer[^105] and does something with the arguments, but the details range from wrong to nonsensical. In particular, it claims that `call_func_ptr` takes four arguments, when it actually takes three[^106], and it implies the arguments after `func_ptr` are passed to `func_ptr`, rather than specifying an array which in turn contains an arbitrary number of actual arguments.

The suggestion that `setup_stack_frame` needs the address of the function to be called seems nonsensical, and has no support in the line-by-line description or any relation to the actual code. It's also noteworthy that the made-up error handling mentioned in the line-by-line's "stack setup" section is not mentioned.

Finally, it doesn't include any control flow. Understanding the execution paths would be a primary focus for a human analyst, but Bard's explanation just breezes through it sequentially here, and except for the loop, mostly ignores it or gets it wildly wrong in the line-by-line.

[^105]: It's unclear whether Bard got this from the name or the code or the combination. For a test more representative of reverse engineering, I should have changed all the labels to something like `loc_xxxxxxxx` as disassemblers do.

[^106]: A human analyzing this code can determine that it only takes three arguments with 100% certainty, because arguments go in `R0-R3` and the only places where `R3` is referenced overwrite it with values from `args`.

Bard goes on to "explain" the pseudo-code:

> Here is a more detailed explanation of each step:
>
>__Save the caller's registers on the stack:__
>
>The `save_registers()` function saves the registers `R4` through `R5` and `LR` onto the stack. This is done to preserve the values of these registers while the function is running.
>

This essentially reiterates the line-by-line. Fair enough.

>__Set up the function's stack frame:__
>
> The `setup_stack_frame()` function performs the following steps:
>
>1. Calculates the address of the function's stack frame by adding the values of the `R1` and `R2` registers, shifted left by 2 bits.
> 2. Subtracts 4 from the `R2` register to account for the space needed for the return address and the four function arguments.
> 3. Copies the caller's stack frame to the function's stack frame.
> 4. Stores the function pointer in the first slot of the stack frame.
> 5. Stores the values of the `arg1`, `arg2`, and `arg3` registers in the next three slots of the stack frame.

This is wrong, including some nonsense from the line-by-line (in #1), and also some new nonsense that didn't appear in the line by line.

In particular #4 and #5 appear to be new, and also completely made up. On #4, the function pointer is passed in using `R0` and moved to `R12` for the call, never stored to memory in any form. Similarly for #5, none of the other arguments to `call_func_ptr` are stored to memory.

It also omits some nonsense that appears in the line-by-line, such as "This means that the stack frame is too large and the function needs to return an error." and "This effectively branches to the return address at the top of the stack frame."

> __Restore the caller's registers:__
>
> The `restore_registers()` function restores the registers `R0` through `R3` from the stack frame at the address `R1` and increments `R1`.

This is wrong, for the reasons explained in the line-by-line. The corresponding code is __loading__ the registers for `func_ptr`, and it would make no sense to __restore__ callers registers before calling `func_ptr`.

> __Call the function:__
>
> The `call_func()` function branches to the function at the address `R12`.
>
> __Clean up the function's stack frame:__
>
> The `cleanup_stack_frame()` function restores the stack pointer (SP) to its original value and pops the registers `R4` through `R5` and `LR` from the stack.
>
> __Return to the caller:__
>
> The `return()` function branches to the return address stored in the `LR` register.

These all generally reflect the line-by-line and are reasonable.

> I hope this more detailed explanation is helpful. Please let me know if you have any other questions.

Sure thing, dude.

## What's the moral of this story? {#the_tl_dr}
Reverse engineers, rejoice! Bard ain't taking your job any time soon, though in less good news, you may need to battle an army of marketing droids and middle managers who think it can.

OK, so Bard did a catastrophically bad job of explaining some random assembly. Did I really expect an LLM to usefully explain non-trivial assembly code or is it just a case of __play stupid games, win stupid prizes?__

I admit I had low expectations, and picked code I expected to be challenging, but OTOH Google promotes "explain code" as a thing Bard can do, and this is ultimately fairly straightforward code[^109]. I have also seen people suggest LLM tools like this could be used for reverse engineering, so a concrete example to back up my inevitable "oh FFS no" may have some value.

[^109]: It arguably should much easier to explain than most code, given that it consists of a very small number of simple, well defined instructions, rather than, say, a bunch of calls to complicated APIs of uncertain versions interacting with unpredictable users and networks.

Beyond that, there's nothing magic about assembly[^6], it's just code and it seems safe to assume that even if Bard can on average do a better job "explaining" some other sorts of code, the underlying failure modes still apply.

[^6]: In this respect, at least, assembly language differs from friendship.

## How about them failure modes, anyway?

1. It's wrong. A lot. Both subtly and outrageously, about minor details and fundamental characteristics.

1. Even when right, __the explanation is not very good__. Almost everything it gets completely correct, you could find by looking up the instruction in a manual. A non-LLM tool which had all the instruction descriptions in a database and displayed them on demand would far superior for this task[^8], since Bard sometimes gets the basics wrong too.

   Some of my "would be more informative" comments may be nitpicks, but the point is that merely paraphrasing the formal instruction definition is an extremely low value explanation. A tool that described where values involved in a particular operation came from would have substantially more value.

1. It fails spectacularly at the bigger picture. The real difficulty of understanding assembly is not about what individual instructions do (which again, can usually be looked up), but keeping track of how they fit together into larger scale logic[^7]. The fact that it entirely butchers or ignores control flow makes it completely unsuitable for this. At a slightly more granular level, many of Bard's explanations are two sentences where the first describes the instruction roughly as a manual might, and the second purports to explain why, like:
> Add the values of the `R1` and `R2` registers, shifted left by 2 bits, to the `R5` register. This calculates the address of the function’s stack frame.

   which would be a helpful approach except that, as here, the second part is __almost always complete bullshit__.

   The pseudo-code similarly purports to give you the big picture, but in fact neither describes the actual underlying logic nor the line-by-line "explanation".

1.  The stuff that's wrong often looks superficially plausible. The explanation for the `NOP` is completely wrong in the specific case, but is generally an explanation that could be correct in others.

    To identify when it's wrong, you frequently need to understand the thing it's wrong about. Which seems sub-optimal for a system that purports to explain things to people who presumably want an explanation because they don't currently understand the thing.

1. LLMs, including Bard, fundamentally don't __understand__ things, and it shows. Being generous the pseudo-code almost kinda-sorta reflects what the function does, and also kind-sorta matches the line-by-line "explanation", but in the specifics the entire thing is wrong, incoherent and self contradictory.

   __There is no chance you could implement the original function from Bard's description__, and if you tried to implement what it describes, after stripping out the incoherent bits you'd most likely end up with something like:
```
call_func_ptr(func, a, b, c):
 func(a, b, c)
```
   which would be trivial, quite pointless, and also would not require almost any of the code implied by Bard's description.[^107]

[^7]: For this author anyway: My eyes tend to glaze over at stretches of code that juggle more than a few values in a not totally obvious way. YMMV.
[^8]: Producing such a tool might get you in trouble with the copyright owners of the manuals, unless perhaps you happen to be a multi-billion dollar company and obfuscate the content in a big [pile of linear algebra](https://xkcd.com/1838/).

More generally, this provides yet another example of one of the pernicious failure modes of LLMs as information sources: They are often fairly good at getting well known stuff approximately right, but transition seamlessly into utter bullshit as soon as you move to anything more obscure. If you only know a little assembly, you might well see the first few lines check out and figure the rest must be just as good. __It ain't__.

[^107]: Obviously, it would be trivial to write in C, and in ARM, it could be written
    ```
    MOV R12, R0
    MOV R0, R1
    MOV R1, R2
    MOV R2, R3
    BX R12
    ```
    If you're wondering, wait shouldn't that be `BLX`? No, this is a tail call: When the function in `R12` returns it will use the original `LR` to return directly to the caller of this function

## Closing thoughts
None of this will surprise those who view LLMs as [Frankfurtian bullshit](https://en.wikipedia.org/wiki/On_Bullshit) machines or __spicy autocomplete__.[^10]

[^10]: I unfortunately don't know who to credit this excellent coinage to. Hit me up if you have the source.

One common reaction I see to discussion of LLM failures like this is "well, humans get stuff wrong too" which is true, as far as it goes: Humans do regularly make errors.[^12] But the __kind__ of errors humans make largely do not resemble the kind Bard makes here. Sure, you might get the occasional over-confident newbie or BSer on Stack Overflow[^108], but generally speaking people explaining code to each other do not just make stuff up out of thin air, and do make some effort to communicate how confident or not they are about their understanding.

[^12]: I'm sure my description of code in this post contains a few, feel free to point them out on [mastodon](https://mastodon.social/@reedmideke).

[^108]: Though rumor has it the over-confident BSers you encounter these days are likely to be using an LLM to boost their clout by posting more answers about things they don't actually understand.

The LLM providers tend to address concerns about errors by plastering their products with disclaimers. In the case of Bard, "Use code with caution" appears on every code block and "Bard may display inaccurate info, including about people, so double-check its responses" appears at the bottom of the page, but it's hard to see this as anything other than CYA when they simultaneously hype how the product is about to revolutionize everything.[^9]

[^9]: Not infrequently adding a caveat along the lines of "if it doesn't go full skynet and kill us all first", which always struck me as an odd sales pitch.

All of which brings me back to the question that's bugged me since these things first appeared: What is supposed to be the value of a system which provides "information" that requires you to go through and use other sources to determine whether each significant element is bullshit?

## Bonus comedy
1. One of the transcript options in Bard is to export to a google doc. Which gave me this:

   [![Screenshot of a google docs transcript of the Google Bard explanation. The whole left side is covered with assembler code from the prompt, overflowing into the google docs UI](/assets/img/bard-assembly/bard-assembly-gdoc.png)](/assets/img/bard-assembly/bard-assembly-gdoc.png)

   The cyberpunk assembly code leaking out over the left side turns out to be because Bard used __the entire prompt__, complete with newlines and spaces, as the filename. This overflows the docs UI and is unclickable and blocks the underlying UI unless you edit the document name.

1. This page will presumably be crawled and ingested for future LLM training, leading to Bard's BS explanations of ARM assembly being picked up by future models. I for one welcome our Habsburg AI[^11] overlords!

[^11]: [https://twitter.com/jathansadowski/status/1625245803211272194](https://twitter.com/jathansadowski/status/1625245803211272194)

<br>
<br>

---
<br>
<br>

