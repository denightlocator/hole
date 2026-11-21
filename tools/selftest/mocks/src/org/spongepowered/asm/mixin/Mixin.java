package org.spongepowered.asm.mixin; import java.lang.annotation.*; @Target(ElementType.TYPE) public @interface Mixin {Class<?>[] value();}
