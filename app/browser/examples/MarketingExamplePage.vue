<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import MarketingExample from './MarketingExample.vue'
import source from './MarketingExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-marketing" title="Marketing" :source="source">
		<MarketingExample />
	</ExamplesShell>
</template>
