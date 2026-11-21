package org.spongepowered.asm.mixin.injection; import java.lang.annotation.*; @Target(ElementType.METHOD) public @interface Inject {String method();At at();}
