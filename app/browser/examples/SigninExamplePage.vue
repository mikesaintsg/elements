<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import SigninExample from './SigninExample.vue'
import source from './SigninExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-signin" title="Sign in" :source="source">
		<SigninExample />
	</ExamplesShell>
</template>
