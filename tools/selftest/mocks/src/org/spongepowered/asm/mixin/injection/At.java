package org.spongepowered.asm.mixin.injection; import java.lang.annotation.*; @Target({ElementType.METHOD,ElementType.ANNOTATION_TYPE}) public @interface At {String value();}
