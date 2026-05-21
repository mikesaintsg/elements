<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import PricingExample from './PricingExample.vue'
import source from './PricingExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-pricing" title="Pricing" :source="source">
		<PricingExample />
	</ExamplesShell>
</template>
